<?php
require __DIR__.'/../backend/bootstrap.php';web_session();if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit;}
try{csrf();}catch(InvalidArgumentException $err){http_response_code(403);exit('Invalid session token.');}
$_SESSION=[];$p=session_get_cookie_params();setcookie(session_name(),'',time()-42000,$p['path'],'',$p['secure'],true);session_destroy();header('Location: login.php');
