<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';

function rzp_settings(?string $mode=null): array {
    $mode=$mode??setting('RAZORPAY_MODE','test');
    if(!in_array($mode,['test','live'],true))throw new RuntimeException('Invalid Razorpay mode.');
    $prefix='RAZORPAY_'.strtoupper($mode).'_';
    $id=setting($prefix.'KEY_ID');$secret=setting($prefix.'KEY_SECRET');
    $enabled=setting('RAZORPAY_ENABLED','0')==='1';
    $ready=$enabled&&preg_match('/^rzp_'.$mode.'_[A-Za-z0-9]+$/',$id)&&$secret!=='';
    return ['mode'=>$mode,'key_id'=>$id,'secret'=>$secret,'webhook_secret'=>setting($prefix.'WEBHOOK_SECRET'),'ready'=>(bool)$ready];
}
function rzp_api(string $method,string $path,array $payload=[],?string $mode=null): array {
    $config=rzp_settings($mode);
    if(!$config['ready'])throw new RuntimeException('Razorpay is not configured. Use QR/bank transfer or contact the Trust.');
    if(!extension_loaded('curl'))throw new RuntimeException('Server PHP cURL support is required.');
    $base='https://api.razorpay.com/v1';
    // Isolated test runner only. This switch cannot redirect Apache or live-mode requests.
    if(PHP_SAPI==='cli-server'&&$config['mode']==='test'&&setting('NGO_ALLOW_PAYMENT_MOCK')==='1'){
        $mock=setting('RAZORPAY_TEST_API_BASE');
        if(!preg_match('~^http://127\\.0\\.0\\.1:[0-9]{4,5}/v1$~',$mock))throw new RuntimeException('Invalid isolated test transport.');
        $base=$mock;
    }
    $curl=curl_init($base.$path);
    curl_setopt_array($curl,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_USERPWD=>$config['key_id'].':'.$config['secret'],CURLOPT_HTTPAUTH=>CURLAUTH_BASIC,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_TIMEOUT=>25,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_HTTPHEADER=>['Content-Type: application/json']]);
    if($payload)curl_setopt($curl,CURLOPT_POSTFIELDS,json_encode($payload,JSON_THROW_ON_ERROR));
    $raw=curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_HTTP_CODE);curl_close($curl);
    if($raw===false||$status<200||$status>=300)throw new RuntimeException('Razorpay could not confirm this request. Please retry verification or contact the Trust before paying again.');
    $result=json_decode($raw,true,512,JSON_THROW_ON_ERROR);
    if(!is_array($result))throw new RuntimeException('Invalid payment service response.');
    return $result;
}
function rzp_owned(int $id): array {
    $row=query("SELECT * FROM ngo_donations WHERE id=? AND payment_method='razorpay'",[$id])->fetch();
    if(!$row||!hash_equals($row['gateway_owner_hash']??'',hash('sha256',$_SESSION['csrf'])))throw new InvalidArgumentException('This payment does not belong to this session.');
    return $row;
}
function rzp_signature(array $row,string $payment,string $signature): void {
    if(!preg_match('/^pay_[A-Za-z0-9]+$/',$payment)||!preg_match('/^[a-f0-9]{64}$/',$signature))throw new InvalidArgumentException('Invalid payment verification data.');
    $settings=rzp_settings($row['gateway_mode']);
    if(!$settings['ready'])throw new RuntimeException('Payment verification is not configured.');
    $expected=hash_hmac('sha256',$row['razorpay_order_id'].'|'.$payment,$settings['secret']);
    if(!hash_equals($expected,$signature))throw new InvalidArgumentException('Payment signature could not be verified. No payment was confirmed.');
}
function rzp_confirm(array $row,string $payment): array {
    $entity=rzp_api('GET','/payments/'.rawurlencode($payment),[],$row['gateway_mode']);
    if(($entity['id']??'')!==$payment||($entity['order_id']??'')!==$row['razorpay_order_id']||($entity['currency']??'')!=='INR'||(int)($entity['amount']??0)!==(int)$row['gateway_expected_amount'])throw new InvalidArgumentException('Payment amount, currency or order does not match the saved donation.');
    if(($entity['status']??'')!=='captured'||($entity['captured']??false)!==true){
        if($row['payment_status']!=='paid')query("UPDATE ngo_donations SET razorpay_payment_id=?,gateway_error=? WHERE id=? AND payment_status<>'paid'",[$payment,'Payment is not captured; awaiting server confirmation.',$row['id']]);
        return ['paid'=>false,'status'=>'pending','message'=>'Payment is not yet captured. Confirmation is pending; please do not pay again.'];
    }
    $order=rzp_api('GET','/orders/'.rawurlencode($row['razorpay_order_id']),[],$row['gateway_mode']);
    if(($order['id']??'')!==$row['razorpay_order_id']||($order['currency']??'')!=='INR'||(int)($order['amount']??0)!==(int)$row['gateway_expected_amount']||(int)($order['amount_paid']??0)!==(int)$row['gateway_expected_amount']||($order['status']??'')!=='paid')throw new InvalidArgumentException('Order settlement has not been confirmed. Contact the Trust before paying again.');
    db()->beginTransaction();
    try{
        $fresh=query('SELECT * FROM ngo_donations WHERE id=? FOR UPDATE',[$row['id']])->fetch();
        if($fresh['payment_status']!=='paid'){
            query("UPDATE ngo_donations SET payment_status='paid',razorpay_payment_id=?,payment_reference=?,gateway_verified_at=UTC_TIMESTAMP(),verified_at=UTC_TIMESTAMP(),verification_note=?,gateway_error=NULL WHERE id=?",[$payment,$payment,'Razorpay API confirmed captured payment and matching order, amount and INR currency.',$row['id']]);
        }elseif($fresh['razorpay_payment_id']!==$payment)throw new InvalidArgumentException('This order has already been paid by a different payment.');
        db()->commit();
    }catch(Throwable $error){if(db()->inTransaction())db()->rollBack();throw $error;}
    return ['paid'=>true,'status'=>'paid','mode'=>$row['gateway_mode'],'message'=>$row['gateway_mode']==='test'?'Test payment verified. No real money was donated.':'Payment verified successfully. Thank you for supporting the Trust.'];
}
