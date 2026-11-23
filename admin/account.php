<?php
declare(strict_types=1);
require __DIR__.'/../backend/bootstrap.php';
admin();
$user=query('SELECT id,email,password_hash FROM ngo_admin_users WHERE id=?',[$_SESSION['admin_id']])->fetch();
$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
 try{
  csrf();rate_limit('account-change-'.$_SESSION['admin_id'],8,900);
  $email=field('email',254);
  if(!filter_var($email,FILTER_VALIDATE_EMAIL))throw new InvalidArgumentException('Enter a valid login email.');
  $current=$_POST['current_password']??'';$password=$_POST['new_password']??'';$confirmation=$_POST['confirm_password']??'';
  if(!is_string($current)||!is_string($password)||!is_string($confirmation)||strlen($current)>72)throw new InvalidArgumentException('Invalid password input.');
  if(!password_verify($current,$user['password_hash']))throw new InvalidArgumentException('Current password is incorrect.');
  if($password!==''){
   if(strlen($password)<12||strlen($password)>72)throw new InvalidArgumentException('New password must contain 12–72 bytes.');
   if($password!==$confirmation)throw new InvalidArgumentException('New password and confirmation do not match.');
  }elseif($confirmation!=='')throw new InvalidArgumentException('Enter a new password or leave both new-password fields empty.');
  if(query('SELECT id FROM ngo_admin_users WHERE email=? AND id<>?',[$email,$user['id']])->fetch())throw new InvalidArgumentException('That email is already used by another admin.');
  $hash=$password!==''?password_hash($password,PASSWORD_DEFAULT):$user['password_hash'];
  db()->beginTransaction();
  // Match the original hash/email to prevent concurrent updates overwriting each other.
  $saved=query('UPDATE ngo_admin_users SET email=?,password_hash=? WHERE id=? AND email=? AND password_hash=?',[$email,$hash,$user['id'],$user['email'],$user['password_hash']]);
  if(!$saved->rowCount()&&($email!==$user['email']||$password!==''))throw new InvalidArgumentException('Account changed in another session. Sign in again.');
  audit('account',(int)$user['id'],'Updated login credentials');
  db()->commit();
  unset($_SESSION['admin_id'],$_SESSION['auth_stamp']);session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));
  header('Location: login.php?updated=1');exit;
 }catch(InvalidArgumentException $err){if(db()->inTransaction())db()->rollBack();$error=$err->getMessage();}
 catch(Throwable $err){if(db()->inTransaction())db()->rollBack();throw $err;}
}
require __DIR__."/layout.php";admin_start("Account settings","account");?>
<section class="panel"><h1>Change login email or password</h1><p>Your current password is required. After saving, sign in again with your updated credentials.</p>
<?php if($error):?><p role="alert" class="error"><?=e($error)?></p><?php endif;?>
<form method="post"><input type="hidden" name="csrf" value="<?=e($_SESSION['csrf'])?>">
<label>Login email<input name="email" type="email" value="<?=e($user['email'])?>" required maxlength="254" autocomplete="username"></label>
<label>Current password<input name="current_password" type="password" required maxlength="72" autocomplete="current-password"></label>
<label>New password (optional)<input name="new_password" type="password" minlength="12" maxlength="72" autocomplete="new-password" aria-describedby="password-help"></label>
<label>Confirm new password<input name="confirm_password" type="password" maxlength="72" autocomplete="new-password"></label>
<p id="password-help" class="muted">Leave both new-password fields empty to change only your email. New passwords must be 12–72 bytes. Use 12–72 ASCII characters for consistent length.</p><button>Save account changes</button></form></section><?php admin_end();?>
