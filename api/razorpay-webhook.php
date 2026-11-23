<?php
declare(strict_types=1);
require __DIR__.'/../backend/razorpay.php';header('Content-Type: application/json');header('Cache-Control: no-store');
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit;}
try{
    $mode=$_GET['mode']??setting('RAZORPAY_MODE','test');
    if(!is_string($mode)||!in_array($mode,['test','live'],true))throw new InvalidArgumentException('Invalid mode.');
    $cfg=rzp_settings($mode);if((int)($_SERVER['CONTENT_LENGTH']??0)>262144)throw new InvalidArgumentException('Webhook payload too large.');$raw=file_get_contents('php://input',false,null,0,262145);
    if(!$cfg['ready']||$cfg['webhook_secret']===''||strlen($raw)>262144)throw new InvalidArgumentException('Webhook unavailable.');
    $signature=$_SERVER['HTTP_X_RAZORPAY_SIGNATURE']??'';
    if(!is_string($signature)||!hash_equals(hash_hmac('sha256',$raw,$cfg['webhook_secret']),$signature))throw new InvalidArgumentException('Invalid webhook signature.');
    $event=json_decode($raw,true,512,JSON_THROW_ON_ERROR);
    if(in_array($event['event']??'',['payment.captured','order.paid'],true)){
        $payment=$event['payload']['payment']['entity']??[];
        if(!preg_match('/^pay_[A-Za-z0-9]+$/',$payment['id']??'')||!preg_match('/^order_[A-Za-z0-9]+$/',$payment['order_id']??''))throw new InvalidArgumentException('Invalid webhook payment.');
        $row=query("SELECT * FROM ngo_donations WHERE razorpay_order_id=? AND gateway_mode=? AND payment_method='razorpay'",[$payment['order_id'],$mode])->fetch();
        if($row){$result=rzp_confirm($row,$payment['id']);if(!$result['paid'])throw new RuntimeException('Captured payment is not yet confirmed by the API.');}
    }
    echo json_encode(['ok'=>true]);
}catch(InvalidArgumentException $error){http_response_code(400);echo json_encode(['ok'=>false,'message'=>'Webhook verification failed.']);}
catch(Throwable $error){error_log('NGO Razorpay webhook could not be confirmed.');http_response_code(503);echo json_encode(['ok'=>false,'message'=>'Retry webhook confirmation later.']);}
