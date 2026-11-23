<?php
declare(strict_types=1);
$configFile=getenv('NGO_CONFIG_FILE') ?: dirname(__DIR__,3).'/ngo-private/config.php';
$local=is_file($configFile) ? require $configFile : [];
function setting(string $key,string $default=''): string {global $local; $v=getenv($key);return $v!==false?$v:(string)($local[$key]??$default);}
function db(): PDO {
 static $db; if(!$db){
 $user=setting('NGO_DB_USER'); $name=setting('NGO_DB_NAME','janseva_ngo_db');
 if(!$user || !preg_match('/^[a-zA-Z0-9_]+$/',$name)) throw new RuntimeException('Database not configured.');
 $db=new PDO('mysql:host='.setting('NGO_DB_HOST','127.0.0.1').';port='.setting('NGO_DB_PORT','3306').';dbname='.$name.';charset=utf8mb4',$user,setting('NGO_DB_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
 } return $db;
}
function query(string $sql,array $params=[]): PDOStatement {$s=db()->prepare($sql);$s->execute($params);return $s;}
function e(mixed $v):string{return htmlspecialchars((string)$v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function private_dir():string{
 $path=setting('NGO_PRIVATE_DIR',dirname(__DIR__,3).'/ngo-private');
 if(!is_dir($path)&&!@mkdir($path,0700,true))throw new RuntimeException('Storage unavailable.');
 $real=realpath($path);$public=realpath(dirname(__DIR__,2));
 $norm=static fn($p)=>strtolower(str_replace('\\','/',$p));
 if(!$real || ($public&&str_starts_with($norm($real).'/', $norm($public).'/')))throw new RuntimeException('Storage must be outside web root.');
 return $real;
}
function web_session():void{
 if(session_status()===PHP_SESSION_ACTIVE)return;
 ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');session_name('ngo_admin_session');
 session_set_cookie_params(['httponly'=>true,'secure'=>!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off','samesite'=>'Lax','path'=>setting('NGO_BASE_PATH','/ngo').'/']);
 session_start();
 if(isset($_SESSION['admin_id'])&&time()-($_SESSION['last_activity']??0)>1800){unset($_SESSION['admin_id']);session_regenerate_id(true);}
 $_SESSION['last_activity']=time();if(empty($_SESSION['csrf']))$_SESSION['csrf']=bin2hex(random_bytes(32));
 header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('X-Frame-Options: DENY');header('Referrer-Policy: same-origin');
}
function csrf():void{if(!isset($_POST['csrf'])||!is_string($_POST['csrf'])||!hash_equals($_SESSION['csrf'],$_POST['csrf']))throw new InvalidArgumentException('Session expired. Refresh and try again.');}
function admin():void{web_session();if(empty($_SESSION['admin_id'])){header('Location: '.setting('NGO_BASE_PATH','/ngo').'/admin/login.php');exit;}
 $account=query('SELECT email,password_hash FROM ngo_admin_users WHERE id=? AND active=1',[$_SESSION['admin_id']])->fetch();
 if(!$account || !isset($_SESSION['auth_stamp']) || !hash_equals($_SESSION['auth_stamp'],hash('sha256',$account['email'].'|'.$account['password_hash']))){unset($_SESSION['admin_id'],$_SESSION['auth_stamp']);header('Location: '.setting('NGO_BASE_PATH','/ngo').'/admin/login.php');exit;}}
function field(string $key,int $max,bool $required=true,int $min=1):string{
 $raw=$_POST[$key]??'';if(!is_string($raw))throw new InvalidArgumentException('Invalid '.$key);
 $v=trim($raw);if(($required&&strlen($v)<$min)||strlen($v)>$max)throw new InvalidArgumentException('Please check '.$key.'.');return $v;
}
function contact_fields(bool $emailRequired=true):array{
 $n=field('name',100,true,2);$e=field('email',254,$emailRequired);$p=field('phone',20,false);
 if(($emailRequired||$e!=='')&&!filter_var($e,FILTER_VALIDATE_EMAIL))throw new InvalidArgumentException('Enter a valid email.');
 if($p!==''&&!preg_match('/^[+0-9 ()-]{7,20}$/',$p))throw new InvalidArgumentException('Enter a valid phone.');
 return [$n,$e,$p];
}
function rate_limit(string $scope,int $limit,int $seconds):void{
 $key=hash('sha256',$scope.'|'.($_SERVER['REMOTE_ADDR']??'cli'));
 if((int)query('SELECT GET_LOCK(?,5)',['ngo_'.$key])->fetchColumn()!==1)throw new RuntimeException('Please retry shortly.');
 try{
 query('INSERT IGNORE INTO ngo_rate_limits (bucket,started_at,attempts) VALUES (?,UNIX_TIMESTAMP(),0)',[$key]);
 $r=query('SELECT started_at,attempts FROM ngo_rate_limits WHERE bucket=?',[$key])->fetch();
 if(time()-(int)$r['started_at']>=$seconds){query('UPDATE ngo_rate_limits SET started_at=UNIX_TIMESTAMP(),attempts=0 WHERE bucket=?',[$key]);$r['attempts']=0;}
 if((int)$r['attempts']>=$limit)throw new InvalidArgumentException('Too many attempts. Try again later.');
 query('UPDATE ngo_rate_limits SET attempts=attempts+1 WHERE bucket=?',[$key]);
 }finally{query('SELECT RELEASE_LOCK(?)',['ngo_'.$key]);}
}
function audit(string $type,int $id,string $action):void{query('INSERT INTO ngo_audit_log (admin_id,record_type,record_id,action) VALUES (?,?,?,?)',[$_SESSION['admin_id'],$type,$id,$action]);}
set_exception_handler(function(Throwable $err):void{
 error_log('NGO backend: '.get_class($err).' '.$err->getMessage());http_response_code(503);
 if(PHP_SAPI==='cli'){fwrite(STDERR, 'Backend command failed: '.$err->getMessage().PHP_EOL);exit(1);}
 if(str_contains($_SERVER['SCRIPT_NAME']??'','/api/')){header('Content-Type: application/json');echo json_encode(['ok'=>false,'message'=>'Service unavailable. Please contact the Trust or try again later.']);}
 else echo '<h1>Service unavailable</h1><p>Check private server configuration and database migration. No submission has been confirmed.</p>';
});
