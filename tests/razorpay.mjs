import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes,createHmac} from 'node:crypto';
const root=resolve('.'),php='C:/xampp/php/php.exe',mysql='C:/xampp/mysql/bin/mysql.exe';
const database='ngo_rzp_test_'+Date.now(),storage=mkdtempSync(join(tmpdir(),'ngo-rzp-test-'));
const secret=randomBytes(32).toString('hex'),webhookSecret=randomBytes(32).toString('hex'),adminPassword=randomBytes(20).toString('hex'),keyId='rzp_test_simulation';
const env={...process.env,NGO_DB_USER:'root',NGO_DB_PASSWORD:'',NGO_DB_NAME:database,NGO_CONFIG_FILE:join(storage,'unused.php'),NGO_PRIVATE_DIR:storage,NGO_BASE_PATH:'/ngo',RAZORPAY_ENABLED:'1',RAZORPAY_MODE:'test',RAZORPAY_TEST_KEY_ID:keyId,RAZORPAY_TEST_KEY_SECRET:secret,RAZORPAY_TEST_WEBHOOK_SECRET:webhookSecret,NGO_ALLOW_PAYMENT_MOCK:'1',RAZORPAY_TEST_API_BASE:'http://127.0.0.1:8769/v1'};
const orders=new Map(),payments=new Map();let failedOrder=false,count=0,phpServer,cookie='';
function check(value,message){assert.ok(value,message);count++;console.log('PASS '+message);}
function sql(statement){const result=spawnSync(mysql,['-u','root','-h','127.0.0.1','-N','-e',statement],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);return result.stdout.trim();}
function command(args,input){const result=spawnSync(php,args,{cwd:root,env,input,encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);return result.stdout;}
const mock=http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');
 if(req.headers.authorization!=='Basic '+Buffer.from(keyId+':'+secret).toString('base64')){res.writeHead(401);res.end('{}');return;}
 const path=req.url.replace('/v1','');
 if(req.method==='POST'&&path==='/orders'){
  if(failedOrder){res.writeHead(503);res.end('{}');return;}
  let data='';for await(const chunk of req)data+=chunk;
  const body=JSON.parse(data);const id='order_mock'+(orders.size+1);
  const order={...body,id,status:'created',amount_paid:0};orders.set(id,order);res.end(JSON.stringify(order));return;
 }
 if(path.startsWith('/payments/')){const item=payments.get(path.split('/').pop());res.writeHead(item?200:404);res.end(JSON.stringify(item||{}));return;}
 if(path.startsWith('/orders/')){const item=orders.get(path.split('/').pop());res.writeHead(item?200:404);res.end(JSON.stringify(item||{}));return;}
 res.writeHead(404);res.end('{}');
});
async function request(path,options={}){
 const headers={...options.headers};if(cookie)headers.Cookie=cookie;
 const response=await fetch('http://127.0.0.1:8768/ngo/'+path,{...options,headers,redirect:'manual'});
 const header=response.headers.get('set-cookie');if(header)cookie=header.split(';')[0];
 const text=await response.text();return {status:response.status,text,headers:response.headers,json:()=>JSON.parse(text)};
}
async function post(data){return request('api/razorpay.php',{method:'POST',body:new URLSearchParams(data)});}
let csrf;
const donor={name:'Test donor',email:'test@example.invalid',phone:'9876543210',amount:'500',website:'',consent:'1'};
async function create(attempt=randomBytes(16).toString('hex')){const r=await post({csrf,action:'create',attempt,...donor});assert.equal(r.status,200,r.text);return {data:r.json(),attempt};}
function payment(order,options={}){
 const id='pay_mock'+(payments.size+1);const entity={id,order_id:order.order_id,amount:order.amount,currency:'INR',status:'captured',captured:true,...options};payments.set(id,entity);
 if(entity.status==='captured'&&entity.amount===order.amount&&entity.currency==='INR'){const item=orders.get(order.order_id);item.status='paid';item.amount_paid=order.amount;}
 return entity;
}
function verify(order,entity,extra={}){return post({csrf,action:'verify',donation_id:order.donation_id,razorpay_order_id:order.order_id,razorpay_payment_id:entity.id,razorpay_signature:createHmac('sha256',secret).update(order.order_id+'|'+entity.id).digest('hex'),...extra});}
async function hook(entity,signature){
 const raw=JSON.stringify({event:'payment.captured',payload:{payment:{entity}}});
 return request('api/razorpay-webhook.php?mode=test',{method:'POST',body:raw,headers:{'Content-Type':'application/json','X-Razorpay-Signature':signature||createHmac('sha256',webhookSecret).update(raw).digest('hex')}});
}
try{
 sql('CREATE DATABASE '+database+' CHARACTER SET utf8mb4');command(['scripts/migrate.php']);command(['scripts/migrate.php']);check(sql('SELECT COUNT(*) FROM '+database+'.ngo_schema_migrations')==='4','Razorpay migration is replay-safe');
 command(['scripts/create-admin.php','test@example.invalid'],adminPassword+'\n');
 await new Promise(resolve=>mock.listen(8769,'127.0.0.1',resolve));
 phpServer=spawn(php,['-S','127.0.0.1:8768','-t','C:/xampp/htdocs'],{env,windowsHide:true,stdio:['ignore','ignore','pipe']});phpServer.stderr.on('data',()=>{});
 for(let n=0;n<50;n++){try{const info=(await request('api/razorpay.php')).json();csrf=info.csrf;check(info.enabled&&info.mode==='test','Test configuration ready; no secret returned');check(!JSON.stringify(info).includes(secret),'Configuration endpoint does not leak secret');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert(csrf);
 check((await post({action:'create',csrf:'bad',...donor})).status===422,'Create order requires CSRF');
 const first=await create();const order=first.data;
 check(order.amount===50000&&order.currency==='INR'&&order.key_id===keyId,'Server order uses INR minor units and only public key ID');
 check(sql('SELECT payment_status FROM '+database+'.ngo_donations WHERE id='+order.donation_id)==='pending','New online donation remains Pending');
 const duplicate=await post({csrf,action:'create',attempt:first.attempt,...donor});
 check(duplicate.json().order_id===order.order_id&&orders.size===1,'Repeated create request reuses saved order');
 check((await post({csrf,action:'create',attempt:first.attempt,...donor,amount:'501'})).status===422,'Changed amount cannot reuse checkout attempt');
 const captured=payment(order);
 check((await verify(order,captured,{razorpay_signature:'0'.repeat(64)})).status===422,'Forged signature rejected');
 check(sql('SELECT payment_status FROM '+database+'.ngo_donations WHERE id='+order.donation_id)==='pending','Invalid signature leaves Pending');
 check((await verify(order,captured,{razorpay_order_id:'order_wrong'})).status===422,'Callback order ID must match stored order');
 const ownerCookie=cookie,ownerCsrf=csrf;cookie='';csrf=(await request('api/razorpay.php')).json().csrf;
 check((await verify(order,captured)).status===422,'Other session cannot verify donor order');cookie=ownerCookie;csrf=ownerCsrf;
 const verified=await verify(order,captured,{amount:'1'});
 check(verified.json().paid&&verified.json().message.includes('No real money'),'Captured Test payment verified with clear simulation label');
 check(sql('SELECT payment_status FROM '+database+'.ngo_donations WHERE id='+order.donation_id)==='paid','Only verified captured payment marks Paid');
 check(sql('SELECT razorpay_payment_id FROM '+database+'.ngo_donations WHERE id='+order.donation_id)===captured.id,'Payment ID persisted');
 check((await verify(order,captured)).json().paid,'Duplicate verification is idempotent');
 check((await post({csrf,action:'event',donation_id:order.donation_id,state:'cancelled'})).json().paid,'Cancel cannot downgrade Paid');
 const second=(await create()).data;const wrongAmount=payment(second,{amount:second.amount+1});
 check((await verify(second,wrongAmount)).status===422,'Provider amount mismatch rejected');
 const wrongCurrency=payment(second,{currency:'USD'});check((await verify(second,wrongCurrency)).status===422,'Provider currency mismatch rejected');
 const authorised=payment(second,{status:'authorized',captured:false});
 check(!(await verify(second,authorised)).json().paid,'Authorized but uncaptured payment remains unconfirmed');
 check(sql('SELECT razorpay_payment_id FROM '+database+'.ngo_donations WHERE id='+second.donation_id)===authorised.id,'Authorized payment ID saved without marking Paid');
 authorised.status='captured';authorised.captured=true;orders.get(second.order_id).status='paid';orders.get(second.order_id).amount_paid=second.amount;
 check((await hook(authorised,'0'.repeat(64))).status===400,'Invalid webhook signature rejected');
 check((await hook(authorised)).status===200,'Signed captured webhook confirms matching payment');
 check(sql('SELECT payment_status FROM '+database+'.ngo_donations WHERE id='+second.donation_id)==='paid','Webhook recovers captured payment after browser callback');
 check((await hook(authorised)).status===200,'Webhook replay is idempotent');
 const third=(await create()).data;
 check((await post({csrf,action:'event',donation_id:third.donation_id,state:'failed'})).status===200,'Failed checkout handled');
 check(sql('SELECT payment_status FROM '+database+'.ngo_donations WHERE id='+third.donation_id)==='failed','Failed status persisted without Paid');
 check((await post({csrf,action:'event',donation_id:third.donation_id,state:'cancelled'})).status===200,'Cancelled checkout handled');
 const late=payment(third);check((await hook(late)).status===200,'Late capture can recover cancelled checkout');
 failedOrder=true;
 const failed=await post({csrf,action:'create',attempt:randomBytes(16).toString('hex'),...donor});
 check(failed.status===503&&!failed.text.includes(secret),'Provider failure is clear and does not leak secret');
 check(sql("SELECT payment_status FROM "+database+".ngo_donations WHERE gateway_error LIKE 'Order creation%'")==='pending','Unconfirmed order creation remains Pending');
 const login=await request('admin/login.php');const loginToken=login.text.match(/name="csrf" value="([^"]+)"/)[1];
 const signedIn=await request('admin/login.php',{method:'POST',body:new URLSearchParams({csrf:loginToken,email:'test@example.invalid',password:adminPassword})});check(signedIn.status===302,'Admin still signs in');
 const record=await request('admin/donations.php?id='+order.donation_id);check(record.text.includes(order.order_id)&&record.text.includes(captured.id)&&record.text.includes('read-only')===false&&record.text.includes('cannot be edited manually'),'Admin shows order/payment IDs and automatic status');
 const adminCsrf=record.text.match(/name="csrf" value="([^"]+)"/)[1];
 const tamper=await request('admin/donations.php?id='+order.donation_id,{method:'POST',body:new URLSearchParams({csrf:adminCsrf,action:'save',id:order.donation_id,...donor,payment_status:'paid',amount:'1',verification_note:'Manual tamper attempt',verified:'1'})});
 check(tamper.text.includes('read-only'),'Admin cannot override gateway amount/status');
 check(sql('SELECT amount FROM '+database+'.ngo_donations WHERE id='+order.donation_id)==='500.00','Tamper did not change saved amount');
 check(!(await request('admin/index.php')).text.includes('1,500.00'),'Test payments excluded from real donation totals');
 console.log('COMPLETED '+count+' isolated Razorpay checks; not a real provider sandbox transaction.');
}catch(error){console.error(error);process.exitCode=1;}
finally{
 if(phpServer){phpServer.kill();await new Promise(resolve=>phpServer.once('exit',resolve));}
 await new Promise(resolve=>mock.close(resolve));
 sql('DROP DATABASE IF EXISTS '+database);rmSync(storage,{recursive:true,force:true});
}
