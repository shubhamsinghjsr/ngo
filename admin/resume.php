<?php
require __DIR__.'/../backend/bootstrap.php';admin();
$id=filter_input(INPUT_GET,'id',FILTER_VALIDATE_INT);$row=$id?query('SELECT resume_path,resume_name FROM ngo_career_applications WHERE id=?',[$id])->fetch():false;
if(!$row||!preg_match('/^[a-f0-9]{48}\.(pdf|doc|docx)$/',$row['resume_path'])){http_response_code(404);exit;}
$path=private_dir().'/resumes/'.$row['resume_path'];if(!is_file($path)){http_response_code(404);exit;}audit('career',$id,'Downloaded resume');
header('Content-Type: application/octet-stream');header('Content-Disposition: attachment; filename="resume-'.(int)$id.'.'.pathinfo($path,PATHINFO_EXTENSION).'"');header('Content-Length: '.filesize($path));readfile($path);
