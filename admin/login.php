<?php
require __DIR__.'/../backend/bootstrap.php';web_session();if(isset($_SESSION['admin_id'])){header('Location: index.php');exit;}$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
try{
 csrf();rate_limit('login',8,900);$email=field('email',254);$password=$_POST['password']??'';if(!is_string($password)||strlen($password)<1||strlen($password)>72)throw new InvalidArgumentException('Invalid email or password.');
 $user=query('SELECT * FROM ngo_admin_users WHERE email=? AND active=1',[$email])->fetch();
 $hash=$user['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
 if(!password_verify($password,$hash)||!$user)throw new InvalidArgumentException('Invalid email or password.');
 session_regenerate_id(true);$_SESSION['admin_id']=(int)$user['id'];$_SESSION['auth_stamp']=hash('sha256',$user['email'].'|'.$user['password_hash']);$_SESSION['csrf']=bin2hex(random_bytes(32));header('Location: index.php');exit;
}catch(InvalidArgumentException $err){$error=$err->getMessage();}
}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin login | Jan Seva Sangh Trust</title><link rel="stylesheet" href="style.css"></head><body><main class="login panel"><p class="eyebrow">JAN SEVA SANGH TRUST</p><h1>Admin login</h1><p>Sign in to manage website records.</p><?php if(isset($_GET['updated'])):?><p class="success" role="status">Account updated. Sign in with your current login details.</p><?php endif;?><?php if($error):?><p role="alert" class="error"><?=e($error)?></p><?php endif;?><form method="post"><input type="hidden" name="csrf" value="<?=e($_SESSION['csrf'])?>"><label>Email<input name="email" type="email" required autocomplete="username" maxlength="254"></label><label>Password<input name="password" type="password" required autocomplete="current-password" maxlength="72"></label><button>Sign in</button></form><a href="../index.html">Return to website</a></main><footer class="admin-footer"><span class="developer-credit">Designed and Developed by <a href="https://techcoderservice.in/" target="_blank" rel="noopener noreferrer">TechCoder Software Pvt. Ltd.</a></span></footer></body></html>
