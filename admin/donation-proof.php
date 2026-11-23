<?php
declare(strict_types=1);
require __DIR__.'/../backend/bootstrap.php';admin();
$id=filter_input(INPUT_GET,'id',FILTER_VALIDATE_INT);
$row=$id?query('SELECT payment_screenshot_path,payment_screenshot_mime FROM ngo_donations WHERE id=?',[$id])->fetch():false;
if(!$row||!preg_match('/^[a-f0-9]{48}\.(jpg|png|webp)$/',$row['payment_screenshot_path']??'')){http_response_code(404);exit('Payment screenshot is unavailable.');}
$path=private_dir().'/payment-proofs/'.$row['payment_screenshot_path'];
$types=['jpg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp'];
$mime=$types[pathinfo($path,PATHINFO_EXTENSION)];
if(!is_file($path)||!is_readable($path)||(new finfo(FILEINFO_MIME_TYPE))->file($path)!==$mime){http_response_code(404);exit('Payment screenshot is unavailable.');}
audit('donations',(int)$id,'Viewed private payment screenshot');
header('Content-Type: '.$mime);header('Content-Length: '.filesize($path));header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; sandbox");
header('Content-Disposition: inline; filename="donation-proof-'.(int)$id.'.'.pathinfo($path,PATHINFO_EXTENSION).'"');
readfile($path);
