<?php
declare(strict_types=1);
require __DIR__.'/../backend/razorpay.php';web_session();header('Content-Type: application/json');
if($_SERVER['REQUEST_METHOD']==='GET'){
    $cfg=rzp_settings();echo json_encode(['ok'=>true,'enabled'=>$cfg['ready'],'mode'=>$cfg['mode'],'csrf'=>$_SESSION['csrf']]);exit;
}
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit;}
$lock=null;
try{
    csrf();$action=field('action',20);$cfg=rzp_settings();
    if($action==='create'){
        if(!$cfg['ready'])throw new RuntimeException('Online payments are not configured yet. You can use QR/bank transfer.');
        if(field('website',200,false)!==''||field('consent',5)!=='1')throw new InvalidArgumentException('Please review your details and consent.');
        [$name,$email,$phone]=contact_fields(false);
        if($phone==='')throw new InvalidArgumentException('Phone is required.');
        $amount=field('amount',10);
        if(!preg_match('/^[0-9]{1,8}$/',$amount)||(int)$amount<1||(int)$amount>10000000)throw new InvalidArgumentException('Enter a whole-rupee amount between 1 and 10000000.');
        $attempt=field('attempt',32);if(!preg_match('/^[a-f0-9]{32}$/',$attempt))throw new InvalidArgumentException('Invalid checkout attempt.');
        $owner=hash('sha256',$_SESSION['csrf']);$requestKey=hash('sha256',$owner.'|'.$attempt);$lock='rzp_'.$requestKey;
        if((int)query('SELECT GET_LOCK(?,3)',[$lock])->fetchColumn()!==1)throw new RuntimeException('Checkout is already being created. Please wait.');
        $row=query('SELECT * FROM ngo_donations WHERE gateway_request_key=?',[$requestKey])->fetch();
        if($row){
            if($row['name']!==$name||$row['email']!==$email||$row['phone']!==$phone||(int)$row['gateway_expected_amount']!==(int)$amount*100)throw new InvalidArgumentException('Donor details changed. Start a new checkout attempt.');
            if(!$row['razorpay_order_id'])throw new RuntimeException('This order could not be confirmed. Contact the Trust or start a new attempt; no payment was initiated by this request.');
            if($row['payment_status']==='paid')throw new InvalidArgumentException('This donation has already been paid.');
            $cfg=rzp_settings($row['gateway_mode']);
        }else{
            rate_limit('razorpay-create',5,900);
            query("INSERT INTO ngo_donations (name,email,phone,amount,payment_status,payment_method,gateway_mode,gateway_request_key,gateway_owner_hash,gateway_expected_amount) VALUES (?,?,?,?,'pending','razorpay',?,?,?,?)",[$name,$email,$phone,$amount,$cfg['mode'],$requestKey,$owner,(int)$amount*100]);
            $id=(int)db()->lastInsertId();
            try{
                $order=rzp_api('POST','/orders',['amount'=>(int)$amount*100,'currency'=>'INR','receipt'=>'ngo_'.$id,'partial_payment'=>false,'notes'=>['donation_id'=>(string)$id]],$cfg['mode']);
                if(!preg_match('/^order_[A-Za-z0-9]+$/',$order['id']??'')||(int)($order['amount']??0)!==(int)$amount*100||($order['currency']??'')!=='INR')throw new RuntimeException('The payment service returned an invalid order.');
                query('UPDATE ngo_donations SET razorpay_order_id=? WHERE id=?',[$order['id'],$id]);
            }catch(Throwable $error){query('UPDATE ngo_donations SET gateway_error=? WHERE id=?',['Order creation was not confirmed. No Checkout was opened.',$id]);throw $error;}
            $row=query('SELECT * FROM ngo_donations WHERE id=?',[$id])->fetch();
        }
        echo json_encode(['ok'=>true,'donation_id'=>(int)$row['id'],'order_id'=>$row['razorpay_order_id'],'amount'=>(int)$row['gateway_expected_amount'],'currency'=>'INR','key_id'=>$cfg['key_id'],'mode'=>$cfg['mode'],'prefill'=>['name'=>$row['name'],'email'=>$row['email'],'contact'=>$row['phone']]]);
    }elseif(in_array($action,['verify','event','status'],true)){
        rate_limit('razorpay-'.$action,30,900);$id=field('donation_id',20);if(!ctype_digit($id))throw new InvalidArgumentException('Invalid donation.');
        $row=rzp_owned((int)$id);
        if($action==='verify'){
            $postedOrder=field('razorpay_order_id',100);
            if($postedOrder!==$row['razorpay_order_id'])throw new InvalidArgumentException('Order does not match the saved donation.');
            $payment=field('razorpay_payment_id',100);rzp_signature($row,$payment,field('razorpay_signature',64));
            echo json_encode(['ok'=>true]+rzp_confirm($row,$payment));
        }elseif($action==='event'){
            $state=field('state',20);if(!in_array($state,['failed','cancelled'],true))throw new InvalidArgumentException('Invalid checkout state.');
            query("UPDATE ngo_donations SET payment_status=?,gateway_error=? WHERE id=? AND payment_status<>'paid'",[$state,$state==='cancelled'?'Checkout closed without browser confirmation.':'Checkout reported failure; not confirmation of a captured payment.',$row['id']]);
            $fresh=query('SELECT payment_status,gateway_mode FROM ngo_donations WHERE id=?',[$row['id']])->fetch();echo json_encode(['ok'=>true,'paid'=>$fresh['payment_status']==='paid','status'=>$fresh['payment_status'],'message'=>$fresh['payment_status']==='paid'?($fresh['gateway_mode']==='test'?'Test payment already verified. No real money was donated.':'This payment has already been verified on the server.'):'Checkout '.$state.'. No payment has been confirmed by this update.']);
        }else{
            echo json_encode(['ok'=>true,'status'=>$row['payment_status'],'mode'=>$row['gateway_mode'],'paid'=>$row['payment_status']==='paid']);
        }
    }else throw new InvalidArgumentException('Unknown payment action.');
}catch(InvalidArgumentException $error){http_response_code(422);echo json_encode(['ok'=>false,'message'=>$error->getMessage()]);}
catch(Throwable $error){error_log('NGO Razorpay request failed: '.get_class($error));http_response_code(503);echo json_encode(['ok'=>false,'message'=>$error instanceof RuntimeException&&!$error instanceof PDOException?$error->getMessage():'Payment confirmation is unavailable. Contact the Trust before trying another payment.']);}
finally{if($lock)query('SELECT RELEASE_LOCK(?)',[$lock]);}
