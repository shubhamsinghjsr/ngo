import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
export async function browserChecks(cookie,check){
 const profile=mkdtempSync(join(tmpdir(),'ngo-admin-browser-'));
 const edge=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--disable-extensions','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let ws;let next=1;const pending=new Map();const errors=[];
 try{
 let target;for(let i=0;i<60;i++){try{const debugPort=readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0].trim();target=await(await fetch('http://127.0.0.1:'+debugPort+'/json/new?about:blank',{method:'PUT'})).json();break;}catch{await new Promise(r=>setTimeout(r,100));}}
 if(!target)throw Error('Browser unavailable');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=next++;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser command timed out: '+method));},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async(expression)=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
 const [name,...parts]=cookie.split('=');await call('Network.setCookie',{name,value:parts.join('='),url:'http://127.0.0.1:8765/ngo/',path:'/ngo/'});
 for(const width of [390,768,1440]){
 await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<700});
 for(const page of ['admin/index.php','admin/donations.php','admin/career.php','admin/volunteers.php','admin/gallery.php','admin/account.php','career.html','volunteer.html','donate.html','gallery.html']){
 await call('Page.navigate',{url:'http://127.0.0.1:8765/ngo/'+page});
 for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,100));if(await evaluate('document.readyState==="complete"'))break;}
 check(await evaluate("[...document.querySelectorAll(\"footer a\")].some(a=>a.href===\"https://techcoderservice.in/\"&&a.target===\"_blank\"&&a.rel.includes(\"noopener\"))"),"Footer credit opens a safe new tab "+page+" "+width+"px");
 check(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),'Browser '+width+'px '+page+' fits viewport');
 if(page==='admin/index.php'){
 check(await evaluate('JSON.stringify([...document.querySelectorAll(".sidebar nav a")].map(a=>a.getAttribute("href")))===JSON.stringify(["index.php","donations.php","career.php","volunteers.php","gallery.php","account.php"])'),'Sidebar link targets at '+width+'px');
 if(width<=1000){
 await evaluate('document.querySelector(".sidebar-toggle").click()');
 check(await evaluate('document.querySelector(".sidebar-toggle").getAttribute("aria-expanded")==="true"&&document.querySelector(".sidebar").getBoundingClientRect().left===0'),'Mobile sidebar opens '+width+'px');
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
 check(await evaluate('document.querySelector(".sidebar-toggle").getAttribute("aria-expanded")==="false"'),'Escape closes mobile sidebar '+width+'px');
 }else check(await evaluate('document.querySelector(".sidebar").getBoundingClientRect().left===0'),'Desktop sidebar remains visible');
}
if(page==='admin/donations.php'&&width===1440){const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(join(tmpdir(),'ngo-admin-donations-1440.png'),Buffer.from(shot.data,'base64'));}
if(page==='gallery.html'){for(let n=0;n<80;n++){if(await evaluate('document.querySelectorAll("[data-admin-gallery] button").length===1'))break;await new Promise(r=>setTimeout(r,100));}check(await evaluate('document.querySelectorAll("[data-admin-gallery] button").length===1'),'Uploaded photo appears in public gallery '+width+'px');}
 if(page==='donate.html'){
 await evaluate('document.querySelector("input[value=razorpay]").click()');
 check(await evaluate('document.querySelector("#bank-proof-fields").hidden&&document.querySelector("[name=payment_screenshot]").disabled'),'Online choice disables manual proof fields '+width+'px');
 await evaluate('document.querySelector("input[value=bank_transfer]").click()');
 check(await evaluate('!document.querySelector("#bank-proof-fields").hidden&&document.querySelector("[name=payment_screenshot]").required'),'Bank choice restores proof requirements '+width+'px');
 }
 if(page==='career.html')check(await evaluate('!document.querySelector("#career-form [type=submit]").disabled'),'Career submission enabled '+width+'px');
 if(page==='admin/index.php'&&width!==768){const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(join(tmpdir(),'ngo-admin-dashboard-'+width+'.png'),Buffer.from(shot.data,'base64'));}
 }}
 await call('Page.navigate',{url:'http://127.0.0.1:8765/ngo/admin/gallery.php?id=1'});await new Promise(r=>setTimeout(r,600));
 const uploadDocument=await call('DOM.getDocument');const uploadNode=await call('DOM.querySelector',{nodeId:uploadDocument.root.nodeId,selector:'input[name=photo]'});
 await call('DOM.setFileInputFiles',{nodeId:uploadNode.nodeId,files:['C:/xampp/htdocs/ngo/assets/images/trust-team.jpg']});
 await evaluate('document.querySelector(".upload-panel form").requestSubmit()');
 for(let i=0;i<50;i++){await new Promise(r=>setTimeout(r,100));if(await evaluate('document.querySelector(".success")?.textContent.includes("Photo saved successfully")'))break;}
 check(await evaluate('document.querySelector(".success")?.textContent.includes("Photo saved successfully")'),'Admin gallery native browser upload saves successfully without GD');
 await call('Page.navigate',{url:'http://127.0.0.1:8765/ngo/gallery.html'});await new Promise(r=>setTimeout(r,700));
 check(await evaluate('[...document.querySelectorAll(".gallery-item img")].every(image=>image.complete&&image.naturalWidth>0&&image.getAttribute("src").startsWith("api/photo.php?id="))&&document.querySelectorAll(".gallery-item img").length===1'),'Public gallery displays actual uploaded photos without static or placeholder images');
 await evaluate('document.querySelector("[data-admin-gallery] button").click()');
 check(await evaluate('document.querySelector("#lightbox").open&&document.querySelector("#lightbox img").getAttribute("src").startsWith("api/photo.php?id=")'),'Uploaded photo opens in public lightbox');
 await evaluate('document.querySelector("#lightbox").close()');
 await call('Page.navigate',{url:'http://127.0.0.1:8765/ngo/volunteer.html'});await new Promise(r=>setTimeout(r,4200));
 await evaluate('(()=>{const f=document.querySelector("#volunteer-form");Object.entries({name:"Browser Test",email:"browser@example.invalid",phone:"9876543210",interest:"Animal care",availability:"Weekend",message:"Browser integration test registration"}).forEach(([k,v])=>f.elements[k].value=v);f.elements.consent.checked=true;f.requestSubmit();})()');
 for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,100));if(await evaluate('document.querySelector("#volunteer-form .form-status").textContent.includes("received")'))break;}
 
 check(await evaluate('document.querySelector("#volunteer-form .form-status").textContent.includes("received")'),'Real browser volunteer submission receives server confirmation');
 
 await call('Page.navigate',{url:'http://127.0.0.1:8765/ngo/career.html'});await new Promise(r=>setTimeout(r,4200));
 const resumePath=join(profile,'browser-resume.pdf');writeFileSync(resumePath,'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
 const document=await call('DOM.getDocument');const node=await call('DOM.querySelector',{nodeId:document.root.nodeId,selector:'#resume'});await call('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[resumePath]});
 await evaluate('(()=>{const f=document.querySelector("#career-form");Object.entries({name:"Browser Applicant",email:"browser@example.invalid",phone:"9876543210",role:"Test role",message:"Browser career application integration test"}).forEach(([k,v])=>f.elements[k].value=v);f.elements.consent.checked=true;})()');
 await new Promise(r=>setTimeout(r,400));await evaluate('document.querySelector("#career-form").requestSubmit()');
 for(let i=0;i<50;i++){await new Promise(r=>setTimeout(r,100));if(await evaluate('document.querySelector("#career-form .form-status:not(#resume-status)").textContent.includes("received")'))break;}
 check(await evaluate('document.querySelector("#career-form .form-status:not(#resume-status)").textContent.includes("received")'),'Real browser career submission uploads private resume');
 await call('Page.navigate',{url:'http://127.0.0.1:8765/ngo/donate.html'});await new Promise(r=>setTimeout(r,4200));
 const donationDocument=await call('DOM.getDocument');const proofNode=await call('DOM.querySelector',{nodeId:donationDocument.root.nodeId,selector:'input[name=payment_screenshot]'});await call('DOM.setFileInputFiles',{nodeId:proofNode.nodeId,files:['C:/xampp/htdocs/ngo/assets/images/trust-team.jpg']});
 await evaluate('(()=>{const f=document.querySelector("#donation-form");Object.entries({name:"Browser Donor",email:"browser@example.invalid",phone:"9876543210",amount:"500",payment_reference:"BROWSER-TEST"}).forEach(([k,v])=>f.elements[k].value=v);f.elements.consent.checked=true;f.requestSubmit();})()');
 for(let i=0;i<50;i++){await new Promise(r=>setTimeout(r,100));if(await evaluate('document.querySelector("#donation-form .form-status").textContent.toLowerCase().includes("pending")'))break;}
 check(await evaluate('document.querySelector("#donation-form .form-status").textContent.toLowerCase().includes("pending")'),'Real browser donation submission confirms pending status only');
 check(errors.length===0,'No browser JavaScript exceptions');
 }finally{if(ws)ws.close();edge.kill();await new Promise(r=>setTimeout(r,500));try{rmSync(profile,{recursive:true,force:true});}catch{}}
}