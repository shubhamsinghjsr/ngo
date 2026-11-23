<?php
declare(strict_types=1);
require __DIR__.'/../backend/bootstrap.php';
$preview=isset($_GET['preview']);if($preview)admin();
$id=filter_input(INPUT_GET,'id',FILTER_VALIDATE_INT);
$row=$id?query('SELECT file_path FROM gallery WHERE id=?'.($preview?'':' AND archived_at IS NULL'),[$id])->fetch():false;
if(!$row||!preg_match('/^[a-f0-9]{48}\.(jpg|png|webp)$/',$row['file_path'])){
    http_response_code(404);exit;
}
$path=private_dir().'/gallery/'.$row['file_path'];
if(!is_file($path)||!is_readable($path)){http_response_code(404);exit;}
$types=['jpg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp'];
$mime=$types[pathinfo($path,PATHINFO_EXTENSION)];
if((new finfo(FILEINFO_MIME_TYPE))->file($path)!==$mime){http_response_code(404);exit;}
header('Content-Type: '.$mime);
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; sandbox");
header('Content-Disposition: inline; filename="gallery-photo-'.(int)$id.'.'.pathinfo($path,PATHINFO_EXTENSION).'"');
header('Cache-Control: '.($preview?'no-store':'no-cache'));
header('Content-Length: '.filesize($path));
readfile($path);
