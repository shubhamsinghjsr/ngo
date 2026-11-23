import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
const php='C:/xampp/php/php.exe',mysql='C:/xampp/mysql/bin/mysql.exe';
const root=resolve('.'),database='ngo_admin_test_'+Date.now(),storage=mkdtempSync(join(tmpdir(),'ngo-admin-test-'));
const password=randomBytes(24).toString('hex');
const env={...process.env,NGO_DB_USER:'root',NGO_DB_PASSWORD:'',NGO_DB_NAME:database,NGO_PRIVATE_DIR:storage,NGO_BASE_PATH:'/ngo',NGO_TEST_PASSWORD:password,NGO_CONFIG_FILE:join(storage,'unused.php')};
const phpArgs=['-d','extension=zip'];
let checks=0,server;
function check(value,label){assert.ok(value,label);checks++;console.log('PASS '+label);}
function sql(text){const r=spawnSync(mysql,['-h','127.0.0.1','-u','root','-e',text],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);return r.stdout;}
function phpRun(args){const r=spawnSync(php,[...phpArgs,...args],{cwd:root,env,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);return r.stdout;}
let cookie='';
async function request(path,options={}){
 const headers={...options.headers};if(cookie)headers.Cookie=cookie;
 const r=await fetch('http://127.0.0.1:8765/ngo/'+path,{...options,headers,redirect:'manual'});
 const c=r.headers.get('set-cookie');if(c)cookie=c.split(';')[0];
 const text=await r.text();return {status:r.status,text,headers:r.headers,json:()=>JSON.parse(text)};
}
const tokenFrom=text=>text.match(/name="csrf" value="([^"]+)"/)?.[1];
const post=async(path,data)=>request(path,{method:'POST',body:new URLSearchParams(data)});
async function submit(kind,extras={},file){
 const token=(await request('api/forms.php')).json().csrf;
 const data=new FormData();Object.entries({csrf:token,kind,name:'Integration Test Applicant',email:'test@example.invalid',phone:'9876543210',consent:'1',website:'',message:'Integration test message for review.',interest:'Animal care',availability:'Weekend',role:'Test role',amount:'100',...extras}).forEach(([k,v])=>data.set(k,v));
 if(kind==='donation'){data.set('payment_reference',extras.payment_reference||'TEST-UTR-123456');data.set('payment_screenshot',new Blob([readFileSync(join(root,'assets/images/trust-team.jpg'))],{type:'image/jpeg'}),'payment.jpg');}
 if(file)data.set('resume',new Blob([file.bytes],{type:file.mime}),file.name);
 return request('api/forms.php',{method:'POST',body:data});
}
try{
 sql('CREATE DATABASE '+database+' CHARACTER SET utf8mb4');
 phpRun(['scripts/migrate.php']);phpRun(['scripts/migrate.php']);
 check(sql('SELECT COUNT(*) AS versions FROM '+database+'.ngo_schema_migrations').includes('4'),'Migration applies and replays');
 phpRun(['-r', 'require "backend/bootstrap.php";query("INSERT INTO ngo_admin_users (email,password_hash) VALUES (?,?)",["test@example.invalid",password_hash(getenv("NGO_TEST_PASSWORD"),PASSWORD_DEFAULT)]);']);
 server=spawn(php,[...phpArgs,'-d','upload_max_filesize=6M','-d','post_max_size=8M','-S','127.0.0.1:8765','-t','C:/xampp/htdocs'],{env,windowsHide:true,stdio:['ignore','ignore','pipe']});
 let logs='';server.stderr.on('data',d=>logs+=d.toString());
 for(let i=0;i<40;i++){try{await request('admin/login.php');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 check((await request('admin/index.php')).status===302,'Dashboard rejects anonymous visitors');
 check((await request('admin/resume.php?id=1')).status===302,'Resume rejects anonymous visitors');
 const bad=await post('api/forms.php',{kind:'volunteer',csrf:'invalid'});
 check(bad.status===422,'Public form rejects invalid CSRF');
 const donor=await submit('donation',{email:'',payment_status:'paid',payment_reference:'TEST-REFERENCE'});
 check(donor.status===200&&donor.json().ok,'Donation saved');
 check(sql('SELECT payment_status FROM '+database+'.ngo_donations').includes('pending'),'Public donor cannot set paid status');
 check((await request('admin/donation-proof.php?id=1')).status===302,'Payment screenshot rejects anonymous access');
 check((await request('api/photo.php?id=1')).status===404,'Payment screenshot never becomes a public gallery photo');
 check(existsSync(join(storage,'payment-proofs')),'Payment screenshot is stored outside the web root');
 let invalidProof=new FormData();const proofToken=(await request('api/forms.php')).json().csrf;
 const donationFields={csrf:proofToken,kind:'donation',name:'Test donor',phone:'9876543210',email:'',amount:'100',payment_reference:'TEST-INVALID',consent:'1',website:''};
 for(const [key,value]of Object.entries(donationFields))invalidProof.set(key,value);
 invalidProof.set('payment_screenshot',new Blob(['<?php echo 1; ?>'],{type:'image/jpeg'}),'unsafe.jpg');
 check((await request('api/forms.php',{method:'POST',body:invalidProof})).status===422,'Unsafe donation screenshot rejected');
 invalidProof.set('payment_screenshot',new Blob([Buffer.alloc(5*1024*1024+1,65)],{type:'image/jpeg'}),'large.jpg');
 check((await request('api/forms.php',{method:'POST',body:invalidProof})).status===422,'Oversized donation screenshot rejected');
 invalidProof.set('payment_reference','');invalidProof.set('payment_screenshot',new Blob([readFileSync(join(root,'assets/images/trust-team.jpg'))],{type:'image/jpeg'}),'payment.jpg');
 check((await request('api/forms.php',{method:'POST',body:invalidProof})).status===422,'Donation UTR is required');
 check(sql('SELECT COUNT(*) FROM '+database+'.ngo_donations').trim().split('\n').pop().trim()==='1','Rejected proof submissions do not create donation records');
 const volunteer=await submit('volunteer');check(volunteer.json().ok,'Volunteer submission stored');
 const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
 const career=await submit('career',{}, {name:'test.pdf',mime:'application/pdf',bytes:pdf});check(career.json().ok,'Career PDF upload stored privately');
 check(existsSync(join(storage,'resumes')),'Resume saved outside htdocs');
 const spoof=await submit('career',{}, {name:'spoof.pdf',mime:'application/pdf',bytes:Buffer.from('<?php echo 1; ?>')});check(spoof.status===422,'Disguised executable rejected');
 const huge=await submit('career',{}, {name:'large.pdf',mime:'application/pdf',bytes:Buffer.alloc(5*1024*1024+1,65)});check(huge.status===422,'Oversized resume rejected');
 const docxPath=join(storage,'sample.docx');env.NGO_TEST_DOCX=docxPath;
 phpRun(['-r','$z=new ZipArchive();$z->open(getenv("NGO_TEST_DOCX"),ZipArchive::CREATE);$z->addFromString("[Content_Types].xml","<Types/>");$z->addFromString("word/document.xml","<document/>");$z->close();']);
 const docx=await submit('career',{}, {name:'test.docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:readFileSync(docxPath)});check(docx.json().ok,'DOCX structure accepted');
 check((await submit('volunteer',{email:'not-email'})).status===422,'Invalid email rejected');
 check((await submit('volunteer',{website:'spam.example'})).status===422,'Honeypot rejects spam');
 let login=await request('admin/login.php');const oldCookie=cookie;
 check((await post('admin/login.php',{csrf:tokenFrom(login.text),email:'test@example.invalid',password})).status===302,'Admin authenticates');
 check(cookie!==oldCookie,'Session ID regenerated on login');
 let dashboard=await request('admin/index.php');
 check(dashboard.status===200&&dashboard.text.includes('VERIFIED CONTRIBUTIONS')&&!dashboard.text.includes('<table>'),'Dashboard shows overview without mixed record tables');
 let donation=await request('admin/donations.php?id=1');
 check(donation.text.includes('View private payment screenshot')&&donation.text.includes('Verified')&&donation.text.includes('Rejected'),'Admin has screenshot and verification/rejection controls');
 const proof=await request('admin/donation-proof.php?id=1');
 check(proof.status===200&&proof.headers.get('content-type')==='image/jpeg'&&proof.headers.get('cache-control')==='no-store','Admin-only payment screenshot opens with safe image headers');
 const proofBytes=Buffer.from(await(await fetch('http://127.0.0.1:8765/ngo/admin/donation-proof.php?id=1',{headers:{Cookie:cookie}})).arrayBuffer());
 check(proofBytes.equals(readFileSync(join(root,'assets/images/trust-team.jpg'))),'Payment screenshot matches the donor-uploaded image');
 const donationData={csrf:tokenFrom(donation.text),action:'save',id:'1',name:'Test Donor',email:'test@example.invalid',phone:'9876543210',amount:'100',payment_status:'paid',payment_reference:'',verification_note:''};
 let unpaid=await post('admin/donations.php?id=1',donationData);
 check(unpaid.text.includes('To mark Verified'),'Paid status rejects missing verification');
 check(sql('SELECT payment_status FROM '+database+'.ngo_donations').includes('pending'),'Rejected paid change preserves pending status');
 const paid=await post('admin/donations.php?id=1',{...donationData,payment_reference:'TEST-VERIFIED',verification_note:'Verified only as synthetic integration test.',verified:'1'});
 check(paid.status===302,'Verified admin change saved');
 check(sql('SELECT payment_status,verified_by,verified_at FROM '+database+'.ngo_donations').includes('paid'),'Verification metadata stored');
 check((await post('admin/donations.php?id=1',{...donationData,payment_status:'failed',payment_reference:'TEST-REJECTED',verification_note:'Transaction not present in bank statement.'})).status===302,'Admin can reject donation with reason');
 check(sql('SELECT payment_status FROM '+database+'.ngo_donations WHERE id=1').includes('failed'),'Rejected status is persisted');
 check((await post('admin/donations.php?id=1',{...donationData,payment_reference:'TEST-VERIFIED',verification_note:'Verified only as synthetic integration test.',verified:'1'})).status===302,'Admin can verify after reviewing again');
 check((await request('admin/resume.php?id=1')).headers.get('content-disposition')?.includes('attachment'),'Authenticated resume delivered as attachment');
 for(const view of ['career','volunteers']){
 const record=await request('admin/'+view+'.php'+'?id=1');
 const saved=await post('admin/'+view+'.php'+'?id=1',{csrf:tokenFrom(record.text),action:'save',id:'1',status:view==='career'?'reviewing':'contacted',admin_notes:'Test review note'});
 check(saved.status===302,view+' status management');
 }
 let gallery=await request('admin/gallery.php');let form=new FormData();
 for(const [k,v] of Object.entries({csrf:tokenFrom(gallery.text),action:'save',id:'0',title:'Test photo <script>',description:'Test description'}))form.set(k,v);
 form.set('photo',new Blob([readFileSync(join(root,'assets/images/trust-team.jpg'))],{type:'image/jpeg'}),'test.jpg');
 const uploaded=await request('admin/gallery.php',{method:'POST',body:form});check(uploaded.status===302,'Admin image upload');
 
 check((await request('admin/gallery.php')).text.includes('Photo saved successfully'),'Admin confirms photo saved only after database commit');
 const delivered=Buffer.from(await(await fetch('http://127.0.0.1:8765/ngo/api/photo.php?id=1')).arrayBuffer());
 check(delivered.equals(readFileSync(join(root,'assets/images/trust-team.jpg'))),'Public endpoint serves exactly the uploaded JPEG bytes');
 const savedFile=sql('SELECT file_path FROM '+database+'.ngo_gallery WHERE id=1').trim().split('\n').pop().trim();
 check(readFileSync(join(storage,'gallery',savedFile)).equals(delivered),'Stored file and publicly displayed photo are identical');
 const beforeFiles=readdirSync(join(storage,'gallery')).length;
 sql("CREATE TRIGGER "+database+".reject_test_gallery BEFORE INSERT ON "+database+".ngo_gallery FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TEST database failure'");
 let failingForm=new FormData();for(const [key,value] of Object.entries({csrf:tokenFrom(await (await request('admin/gallery.php')).text),action:'save',id:'0',title:'Failure test photo',description:'Preserve my description'}))failingForm.set(key,value);
 failingForm.set('photo',new Blob([readFileSync(join(root,'assets/images/trust-team.jpg'))],{type:'image/jpeg'}),'failure.jpg');
 const failedSave=await request('admin/gallery.php',{method:'POST',body:failingForm});
 check(failedSave.text.includes('Unable to save this photo')&&failedSave.text.includes('Failure test photo'),'Database insert failure has clear inline feedback and preserves entered details');
 check(readdirSync(join(storage,'gallery')).length===beforeFiles,'Failed insert removes only its newly uploaded orphan file');
 check(sql('SELECT COUNT(*) FROM '+database+'.ngo_gallery').trim().split('\n').pop().trim()==='1','Failed insert leaves existing gallery row intact');
 sql('DROP TRIGGER '+database+'.reject_test_gallery');
 let invalidPhoto=new FormData();for(const [key,value] of Object.entries({csrf:tokenFrom((await request('admin/gallery.php')).text),action:'save',id:'0',title:'Invalid image'}))invalidPhoto.set(key,value);
 invalidPhoto.set('photo',new Blob(['<?php echo 1; ?>'],{type:'image/jpeg'}),'unsafe.jpg');
 check((await request('admin/gallery.php',{method:'POST',body:invalidPhoto})).text.includes('Use a valid JPG'),'Disguised executable image rejected with clear feedback');
 const listing=(await request('api/gallery.php')).json();check(listing.photos.length===1,'Public gallery lists database photo');
 check((await request('api/photo.php?id=1')).headers.get('content-type')==='image/jpeg','Image delivery uses safe image MIME');
 gallery=await request('admin/gallery.php?id=1');check(gallery.text.includes('&lt;script&gt;')&&!gallery.text.includes('Test photo <script>'),'Titles safely escaped');
 for(const section of ['donations','career','volunteers','gallery']){
 const page=await request('admin/'+section+'.php');
 check(page.status===200&&page.text.includes('name="q"')&&page.text.includes('<table>'),section+' has its own searchable table');
 check(page.text.includes('href="donations.php"')&&page.text.includes('href="career.php"')&&page.text.includes('href="volunteers.php"')&&page.text.includes('href="gallery.php"'),'Sidebar uses dedicated page links on '+section);
 const found=await request('admin/'+section+'.php?q='+encodeURIComponent(section==='gallery'?'Test photo':'Test'));
 check(found.text.includes('record-name')||found.text.includes('table-photo'),'Search returns matching '+section+' records');
 check((await request('admin/'+section+'.php?q=NO-MATCH-TEST')).text.includes('No records found'),'Search empty state on '+section);
 check((await request('admin/'+section+'.php?q='+encodeURIComponent("' OR 1=1 --"))).text.includes('No records found'),'Search uses prepared parameters on '+section);
}
check((await request('admin/index.php?view=donations&id=1')).headers.get('location')==='donations.php?id=1','Old donation URL redirects to correct page');
for(const section of ['donations','career','volunteers']){
 const page=await request('admin/'+section+'.php');
 check((await post('admin/'+section+'.php',{csrf:tokenFrom(page.text),action:'delete',id:'1'})).text.includes('Confirm deletion'),'Delete confirmation required for '+section);
 check((await post('admin/'+section+'.php',{csrf:tokenFrom(page.text),action:'delete',id:'1',confirm_delete:'1'})).status===302,'Delete archives '+section+' record');
 const archive=await request('admin/'+section+'.php?scope=archived');
 check(archive.text.includes('record-name')&&archive.text.includes('Confirm restore'),'Archive exposes restore action for '+section);
 check((await post('admin/'+section+'.php',{csrf:tokenFrom(archive.text),action:'restore',id:'1'})).status===302,'Restore returns '+section+' record to active list');
}
const legacyPage=await request('admin/volunteers.php?id=1');
check((await post('admin/index.php?view=volunteers&id=1',{csrf:tokenFrom(legacyPage.text),action:'save',id:'1',status:'contacted',admin_notes:'Legacy route test'})).status===302,'Legacy POST integrations remain working');
await (await import('./browser.mjs')).browserChecks(cookie,check);
 check((await submit('donation')).json().message.includes('Too many attempts'),'Donation spam rate limit enforced');
 const edited=await post('admin/gallery.php?id=1',{csrf:tokenFrom(gallery.text),action:'save',id:'1',title:'Edited Test Photo',description:'Edited description'});
 check(edited.status===302,'Gallery title/description edit');
 const deleted=await post('admin/gallery.php',{csrf:tokenFrom(gallery.text),action:'delete',id:'1',confirm_delete:'1'});check(deleted.status===302,'Confirmed gallery delete');
 check((await request('api/photo.php?id=1')).status===404,'Deleted photo unavailable');
 check((await request('api/gallery.php')).json().photos.length===0,'Public gallery reflects deletion');
 check(sql('SELECT COUNT(*) FROM '+database+'.ngo_gallery').includes('1'),'Gallery deletion retains original database row');
 check((await request('api/photo.php?id=1&preview=1')).status===200,'Archived gallery photo accessible only to admin preview');
 const archiveGallery=await request('admin/gallery.php?scope=archived');
 check(archiveGallery.text.includes('Confirm restore'),'Gallery archive offers restore');
 check((await post('admin/gallery.php',{csrf:tokenFrom(archiveGallery.text),action:'restore',id:'1'})).status===302,'Gallery photo restored');
 check((await request('api/gallery.php')).json().photos.length===1,'Restored gallery photo reappears publicly');
 check((await post('admin/volunteers.php',{csrf:'bad',action:'save',id:'1',status:'active'})).text.includes('Session expired'),'Admin updates protected by CSRF');
 let settings=await request('admin/account.php');
 check(settings.status===200&&settings.text.includes('Change login email'),'Account settings available to authenticated admin');
 const settingsData={csrf:tokenFrom(settings.text),email:'changed@example.invalid',current_password:password,new_password:password+'_changed',confirm_password:password+'_changed'};
 check((await post('admin/account.php',{...settingsData,csrf:'bad'})).text.includes('Session expired'),'Account change rejects invalid CSRF');
 check((await post('admin/account.php',{...settingsData,current_password:'incorrect'})).text.includes('Current password is incorrect'),'Account change requires current password');
 check((await post('admin/account.php',{...settingsData,confirm_password:'mismatch'})).text.includes('do not match'),'Password confirmation validated');
 const previousSession=cookie;
 check((await post('admin/account.php',settingsData)).status===302,'Email and password updated');
 cookie=previousSession;check((await request('admin/index.php')).status===302,'Old session invalidated after credential change');
 login=await request('admin/login.php');
 check((await post('admin/login.php',{csrf:tokenFrom(login.text),email:'test@example.invalid',password})).status===200,'Old login credentials rejected');
 login=await request('admin/login.php');
 check((await post('admin/login.php',{csrf:tokenFrom(login.text),email:'changed@example.invalid',password:password+'_changed'})).status===302,'Updated credentials authenticate');
 dashboard=await request('admin/index.php');check((await post('admin/logout.php',{csrf:tokenFrom(dashboard.text)})).status===302,'Logout succeeds');
 check((await request('admin/resume.php?id=1')).status===302,'Resume inaccessible after logout');
 check((await request('admin/donation-proof.php?id=1')).status===302,'Payment proof inaccessible after logout');
 // Migration replay preserves existing test submissions.
 phpRun(['scripts/migrate.php']);check(sql('SELECT COUNT(*) FROM '+database+'.ngo_donations').includes('2'),'Migration preserves existing donation data');
 check((await request('scripts/create-admin.php')).status===404,'Web admin installer disabled');
 console.log('COMPLETED '+checks+' integration checks; isolated test database and files cleaned.');
}catch(error){console.error(error);process.exitCode=1;}
finally{
 if(server){server.kill();await new Promise(r=>server.once('exit',r));}
 sql('DROP DATABASE IF EXISTS '+database);
 rmSync(storage,{recursive:true,force:true});
}