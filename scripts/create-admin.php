<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}require __DIR__.'/../backend/bootstrap.php';
$email=$argv[1]??'';if(!filter_var($email,FILTER_VALIDATE_EMAIL)){fwrite(STDERR,"Usage: php scripts/create-admin.php your-admin-email\n");exit(1);}
fwrite(STDERR,"Password (12–72 bytes, from hidden prompt): ");
$password=rtrim(fgets(STDIN),"\r\n");if(strlen($password)<12||strlen($password)>72){fwrite(STDERR,"Password must have 12–72 bytes.\n");exit(1);}
query('INSERT INTO ngo_admin_users (email,password_hash) VALUES (?,?)',[$email,password_hash($password,PASSWORD_DEFAULT)]);
unset($password);echo "Admin created.\n";
