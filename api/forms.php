<?php
declare(strict_types=1);require __DIR__.'/../backend/uploads.php';web_session();header('Content-Type: application/json');
if($_SERVER['REQUEST_METHOD']==='GET'){echo json_encode(['ok'=>true,'csrf'=>$_SESSION['csrf']]);exit;}
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit;}$stored=null;$storedFolder="resumes";
try{
 check_upload_request_size();csrf();if(field('website',200,false)!=='')throw new InvalidArgumentException('Unable to accept submission.');
 if(field('consent',5)!=='1')throw new InvalidArgumentException('Please acknowledge submission consent.');
 $kind=field('kind',20);if(!in_array($kind,['career','volunteer','donation'],true))throw new InvalidArgumentException('Unknown form.');
 rate_limit('form-'.$kind,5,900);[$name,$email,$phone]=contact_fields($kind!=='donation');
 if($kind==='career'){
 if($phone==='')throw new InvalidArgumentException('Phone is required.');$role=field('role',100,true,2);$message=field('message',2000,true,10);
 [$stored,$mime,$filename]=save_upload('resume');
 query('INSERT INTO ngo_career_applications (name,email,phone,role,message,resume_path,resume_name,resume_mime) VALUES (?,?,?,?,?,?,?,?)',[$name,$email,$phone,$role,$message,$stored,$filename,$mime]);
 $message='Application received. Your resume is stored privately for admin review.';
 }elseif($kind==='volunteer'){
 $interest=field('interest',150);$availability=field('availability',150);$message=field('message',2000,true,10);
 query('INSERT INTO ngo_volunteers (name,email,phone,interest,availability,message) VALUES (?,?,?,?,?,?)',[$name,$email,$phone,$interest,$availability,$message]);
 $message='Volunteer registration received. The Trust can review your details.';
 }else{
 if(field('payment_method',20,false)==='razorpay')throw new InvalidArgumentException('Use the online Checkout option to create a secure payment order.');
 $amount=field('amount',10);if(!preg_match('/^[0-9]{1,8}$/',$amount)||(int)$amount<1||(int)$amount>10000000)throw new InvalidArgumentException('Enter a whole-rupee amount between 1 and 10000000.');
 if($phone==='')throw new InvalidArgumentException('Phone is required for donation verification.');
 $reference=field('payment_reference',150,true,6);
 if(!preg_match('~^[A-Za-z0-9][A-Za-z0-9 /_.-]{5,149}$~',$reference))throw new InvalidArgumentException('Enter a valid UTR or transaction number.');
 $storedFolder='payment-proofs';[$stored,$mime,$filename]=save_upload('payment_screenshot',true,'payment-proofs');
 db()->beginTransaction();
 query("INSERT INTO ngo_donations (name,email,phone,amount,payment_reference,payment_status,payment_screenshot_path,payment_screenshot_mime,payment_screenshot_name) VALUES (?,?,?,?,?,'pending',?,?,?)",[$name,$email,$phone,$amount,$reference,$stored,$mime,$filename]);
 db()->commit();
 $message='Donation proof submitted for review. Status: Pending. This is not payment confirmation or a receipt. The Trust must verify your transfer first.';
 }
 echo json_encode(['ok'=>true,'message'=>$message]);
}catch(InvalidArgumentException | UploadException $err){http_response_code(422);echo json_encode(['ok'=>false,'message'=>$err->getMessage()]);}
catch(Throwable $err){if(db()->inTransaction())db()->rollBack();if($stored)@unlink(private_dir().'/'.$storedFolder.'/'.$stored);throw $err;}
