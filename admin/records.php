<?php
declare(strict_types=1);require_once __DIR__.'/../backend/uploads.php';admin();
$sections=['donations'=>'Donations','career'=>'Career Applications','volunteers'=>'Volunteer Registrations','gallery'=>'Gallery'];
$tables=['donations'=>'ngo_donations','career'=>'ngo_career_applications','volunteers'=>'ngo_volunteers','gallery'=>'gallery'];
if(!isset($view)||!isset($sections[$view])){http_response_code(404);exit;}
$id=filter_input(INPUT_GET,'id',FILTER_VALIDATE_INT)?:0;$error='';$file=null;
if($_SERVER['REQUEST_METHOD']==='POST'){
 try{
 check_upload_request_size();csrf();$action=field('action',20);$rawId=field('id',20);if(!ctype_digit($rawId))throw new InvalidArgumentException('Invalid record ID.');$record=(int)$rawId;
 if(!isset($tables[$view]))throw new InvalidArgumentException('Unknown section.');
 db()->beginTransaction();
 if(in_array($action,['delete','restore'],true)){
 $row=query('SELECT * FROM '.$tables[$view].' WHERE id=? FOR UPDATE',[$record])->fetch();if(!$row)throw new InvalidArgumentException('Record not found.');
 if($action==='delete'&&field('confirm_delete',5,false)!=='1')throw new InvalidArgumentException('Confirm deletion.');
 query('UPDATE '.$tables[$view].' SET archived_at=? WHERE id=?',[$action==='delete'?date('Y-m-d H:i:s'):null,$record]);audit($view,$record,$action==='delete'?'Archived record':'Restored record');db()->commit();
 }elseif($view==='gallery'){
 if($action==='save'){
 $title=field('title',150);$description=field('description',2000,false);$old=null;
 if($record){$old=query('SELECT * FROM gallery WHERE id=? FOR UPDATE',[$record])->fetch();if(!$old)throw new InvalidArgumentException('Photo not found.');}
 if(!$record || (isset($_FILES['photo'])&&$_FILES['photo']['error']!==UPLOAD_ERR_NO_FILE))[$file]=save_upload('photo',true);
 if($record){
 query('UPDATE gallery SET title=?,description=?,file_path=? WHERE id=?',[$title,$description,$file??$old['file_path'],$record]);
 }else{query('INSERT INTO gallery (photo,title,description,file_path) VALUES (?,?,?,?)',[basename($file),$title,$description,$file]);$record=(int)db()->lastInsertId();}
 audit('gallery',$record,'Saved photo');db()->commit();
 }else throw new InvalidArgumentException('Unknown action.');
 }else{
 if($action!=='save')throw new InvalidArgumentException('Unknown action.');
 $row=query('SELECT * FROM '.$tables[$view].' WHERE id=? FOR UPDATE',[$record])->fetch();if(!$row)throw new InvalidArgumentException('Record not found.');
 if($view==='donations'){
 if($row['payment_method']==='razorpay')throw new InvalidArgumentException('Online payment records are read-only. Their status and amount are confirmed by Razorpay on the server.');
 [$name,$email,$phone]=contact_fields(false);$amount=field('amount',15);
 if(!preg_match('/^[0-9]{1,8}(\\.[0-9]{1,2})?$/',$amount)||(float)$amount<=0||(float)$amount>10000000)throw new InvalidArgumentException('Invalid amount.');
 $reference=field('payment_reference',150,false);$status=field('payment_status',20);$note=field('verification_note',2000,false);
 if(!in_array($status,['pending','paid','failed','cancelled'],true))throw new InvalidArgumentException('Invalid status.');
 $verifiedBy=null;$verifiedAt=null;
 if($status==='failed'&&strlen($note)<10)throw new InvalidArgumentException('Enter a rejection reason of at least 10 characters.');
 if($status==='paid'){
 if($reference===''||strlen($note)<10||field('verified',5,false)!=='1')throw new InvalidArgumentException('To mark Verified, verify the bank/gateway transaction and provide its reference, a verification note (10+ characters), and confirmation.');
 $verifiedBy=$_SESSION['admin_id'];$verifiedAt=date('Y-m-d H:i:s');
 }
 query('UPDATE ngo_donations SET name=?,email=?,phone=?,amount=?,payment_reference=?,payment_status=?,verification_note=?,verified_by=?,verified_at=? WHERE id=?',[$name,$email,$phone,$amount,$reference,$status,$note,$verifiedBy,$verifiedAt,$record]);
 audit('donations',$record,'Status '.$row['payment_status'].' → '.$status.'; reference '.$reference);
 }else{
 $status=field('status',20);$allowed=$view==='career'?['new','reviewing','shortlisted','closed']:['new','contacted','active','closed'];
 if(!in_array($status,$allowed,true))throw new InvalidArgumentException('Invalid status.');
 $notes=field('admin_notes',4000,false);query('UPDATE '.$tables[$view].' SET status=?,admin_notes=? WHERE id=?',[$status,$notes,$record]);audit($view,$record,'Updated status to '.$status);
 }
 db()->commit();
 }
 $_SESSION['flash']=$view==='gallery'&&$action==='save'?(($old['archived_at']??null)?'Photo saved successfully. Restore this archived record to publish it.':'Photo saved successfully. It is now available in the public Gallery.'):'Changes saved.';header('Location: '.$view.'.php');exit;
 }catch(InvalidArgumentException | UploadException $err){if(db()->inTransaction())db()->rollBack();if($file)@unlink(private_dir().'/gallery/'.$file);$error=$err->getMessage();}
 catch(Throwable $err){if(db()->inTransaction())db()->rollBack();if($file)@unlink(private_dir().'/gallery/'.$file);if($view!=='gallery')throw $err;error_log('NGO gallery save: '.get_class($err).' '.$err->getMessage());$error='Unable to save this photo. No changes were confirmed. Please check the database connection and server storage, then try again.';}
}
$flash=$_SESSION['flash']??'';unset($_SESSION['flash']);
$record=$id&&isset($tables[$view])?query('SELECT * FROM '.$tables[$view].' WHERE id=?',[$id])->fetch():null;
if($id&&!$record){http_response_code(404);exit('Record not found.');}
function hidden_fields(string $action,int $id):void{echo '<input type="hidden" name="csrf" value="'.e($_SESSION['csrf']).'"><input type="hidden" name="action" value="'.e($action).'"><input type="hidden" name="id" value="'.$id.'">';}
function select_status(string $name,string $current,array $choices):void{echo '<label>Status<select name="'.e($name).'">';foreach($choices as $choice)echo '<option value="'.e($choice).'" '.($current===$choice?'selected':'').'>'.e($name==='payment_status'?(['paid'=>'Verified','failed'=>'Rejected'][$choice]??ucfirst($choice)):ucfirst($choice)).'</option>';echo '</select></label>';}
require __DIR__.'/layout.php';admin_start($sections[$view],$view);
if($error):?><p class="error" role="alert"><?=e($error)?></p><?php endif;
if($flash):?><p class="success" role="status"><?=e($flash)?></p><?php endif;?>
<p class="page-intro"><?=e(['donations'=>'Review donor records and verify transfers before confirming payment.','career'=>'Review applications, download private resumes and track your next steps.','volunteers'=>'Find registrations and manage volunteer follow-up.','gallery'=>'Manage uploaded photographs displayed in the public website gallery.'][$view])?></p>
<?php if($record && $record['archived_at']):?><p class="notice">This record is archived. Restore it from the archive list to make it active again.</p><?php endif;?>
<?php if($record && $view!=='gallery'):?>
<section class="panel"><a href="<?=e($view)?>.php">← All records</a><h2><?=e($record['name'])?></h2><p><?=e($record['created_at'])?> · <?=e($record['email'])?> · <?=e($record['phone'])?></p>
<?php if($view==='career'):?><p>Role: <?=e($record['role'])?></p><p class="profile"><?=e($record['message'])?></p><a class="button" href="resume.php?id=<?=(int)$record['id']?>">Download resume</a><p class="muted">Treat uploaded documents as untrusted. Scan downloaded files before opening.</p>
<?php elseif($view==='volunteers'):?><p>Interest: <?=e($record['interest'])?><br>Availability: <?=e($record['availability'])?></p><p class="profile"><?=e($record['message'])?></p><?php endif;?>
<?php if($view==='donations'&&$record['payment_method']==='razorpay'):?><section class="notice"><h3>Razorpay payment</h3><p>Mode: <?=e(strtoupper($record['gateway_mode']??''))?><br>Order ID: <?=e($record['razorpay_order_id']??'Not confirmed')?><br>Payment ID: <?=e($record['razorpay_payment_id']??'Not confirmed')?><br>Status: <?=e(ucfirst($record['payment_status']))?><br>Amount: INR <?=e($record['amount'])?></p><p><?=e($record['gateway_error']??$record['verification_note']??'Awaiting server verification.')?></p><p>Online payment status is verified automatically. Amount and payment status cannot be edited manually.</p></section><?php else:?><form method="post"><?php hidden_fields('save',(int)$record['id']);?>
<?php if($view==='donations'):?>
<label>Donor name<input name="name" required maxlength="100" value="<?=e($record['name'])?>"></label><label>Email<input name="email" type="email" required maxlength="254" value="<?=e($record['email'])?>"></label><label>Phone<input name="phone" maxlength="20" value="<?=e($record['phone'])?>"></label><label>Amount in INR<input type="number" name="amount" min="0.01" max="10000000" step="0.01" required value="<?=e($record['amount'])?>"></label><label>UTR / transaction number<input name="payment_reference" maxlength="150" value="<?=e($record['payment_reference'])?>"></label>
<?php if($record['payment_screenshot_path']??null):?><p><a class="button" href="donation-proof.php?id=<?=(int)$record['id']?>" target="_blank" rel="noopener noreferrer">View private payment screenshot</a></p><?php else:?><p class="muted">No screenshot was supplied with this older record.</p><?php endif;?><p class="notice">A screenshot or donor-supplied UTR alone does not prove settlement. Verify the bank or trusted gateway record before marking Verified.</p><?php select_status('payment_status',$record['payment_status'],['pending','paid','failed','cancelled']);?>
<p class="muted">Enter a verification note or rejection reason of at least 10 characters. Verified also requires the confirmation below.</p><label>Review note / rejection reason<textarea name="verification_note" maxlength="2000"><?=e($record['verification_note'])?></textarea></label><label class="check"><input type="checkbox" name="verified" value="1">I have verified this transaction against a bank statement or trusted payment gateway record. Required whenever marking Verified.</label>
<p class="muted">A donor-supplied reference is not payment evidence. Last verified: <?=e($record['verified_at']??'Not verified')?>.</p>
<?php else: select_status('status',$record['status'],$view==='career'?['new','reviewing','shortlisted','closed']:['new','contacted','active','closed']);?><label>Admin notes<textarea name="admin_notes" maxlength="4000"><?=e($record['admin_notes'])?></textarea></label><?php endif;?>
<button>Save changes</button></form><?php endif;?></section>
<?php elseif($view==='gallery'):?><details class="panel upload-panel" <?=($record||$error)?'open':''?>><summary><?=$record?'Edit selected photo':'Add a gallery photo'?></summary>
<section class="panel"><h2><?=$record?'Edit photo':'Add photo'?></h2><p>Manage photographs uploaded through this panel. Existing local gallery photographs remain available on the website.</p><p>JPG, PNG or WebP, maximum 5 MB. Your uploaded image is saved privately and displayed in the public Gallery.</p><?php if($record):?><img class="gallery-preview" src="../api/photo.php?id=<?=(int)$record['id']?>&amp;preview=1" alt="<?=e($record['title'])?>"><?php endif;?><form method="post" enctype="multipart/form-data"><?php hidden_fields('save',(int)($record['id']??0));?><label>Title<input name="title" required maxlength="150" value="<?=e($_SERVER['REQUEST_METHOD']==='POST'&&isset($_POST['title'])&&is_string($_POST['title'])?$_POST['title']:($record['title']??''))?>"></label><label>Description<textarea name="description" maxlength="2000"><?=e($_SERVER['REQUEST_METHOD']==='POST'&&isset($_POST['description'])&&is_string($_POST['description'])?$_POST['description']:($record['description']??''))?></textarea></label><label><?=$record?'Replace image (optional)':'Photo'?><input type="file" name="photo" accept=".jpg,.jpeg,.png,.webp" <?=$record?'':'required'?>></label><button>Save photo</button><?php if($record):?> <a href="gallery.php">Cancel edit</a><?php endif;?></form></section><?php if($view==='gallery'):?></details><?php endif;?>
<?php endif;?>
<?php if(!$record):
$q=$_GET['q']??'';$scope=$_GET['scope']??'active';
if(!is_string($q)||strlen($q)>150||!is_string($scope)||!in_array($scope,['active','archived'],true)){http_response_code(400);echo '<p>Invalid search.</p>';admin_end();exit;}
$q=trim($q);$params=[];$where=' WHERE archived_at IS '.($scope==='archived'?'NOT NULL':'NULL');
$columns=['donations'=>['name','email','phone','payment_reference','payment_status'],'career'=>['name','email','phone','role','status'],'volunteers'=>['name','email','phone','interest','availability','status'],'gallery'=>['title','description']][$view];
if($q!==''){$where.=' AND ('.implode(' OR ',array_map(fn($column)=>$column.' LIKE ?',$columns)).')';$params=array_fill(0,count($columns),'%'.$q.'%');}
$total=(int)query('SELECT COUNT(*) FROM '.$tables[$view].$where,$params)->fetchColumn();$pages=max(1,(int)ceil($total/25));
$page=filter_input(INPUT_GET,'page',FILTER_VALIDATE_INT)?:1;$page=min(max(1,$page),$pages);$offset=($page-1)*25;
$rows=query('SELECT * FROM '.$tables[$view].$where.' ORDER BY id DESC LIMIT 25 OFFSET '.$offset,$params)->fetchAll();
?>
<section class="panel records-panel"><div class="table-toolbar"><div><h2><?=$scope==='archived'?'Archived records':'All records'?></h2><p class="muted"><?=e($total)?> matching <?=e($total===1?'record':'records')?></p></div></div>
<form class="search-bar" method="get" role="search"><label>Search records<input type="search" name="q" maxlength="150" value="<?=e($q)?>" placeholder="<?=e($view==='gallery'?'Search titles or descriptions':'Search name, email or details')?>"></label><label>Show<select name="scope"><option value="active" <?=$scope==='active'?'selected':''?>>Active records</option><option value="archived" <?=$scope==='archived'?'selected':''?>>Archived records</option></select></label><button>Search</button><a class="reset-search" href="<?=e($view)?>.php">Reset</a></form>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?=e($sections[$view])?> table"><table><caption class="sr-only"><?=e($sections[$view])?> search results</caption><thead><tr>
<?php if($view==='gallery'):?><th scope="col">Photo</th><th scope="col">Title / description</th>
<?php else:?><th scope="col">Name</th><th scope="col">Contact</th><th scope="col"><?=$view==='donations'?'Amount / UTR':'Role / interest'?></th><th scope="col">Status</th><?php endif;?>
<th scope="col">Date</th><th scope="col">Actions</th></tr></thead><tbody>
<?php foreach($rows as $row):?><tr>
<?php if($view==='gallery'):?><td><?php if(!empty($row['file_path'])):?><img class="table-photo" src="../api/photo.php?id=<?=(int)$row['id']?><?=$scope==='archived'?'&preview=1':''?>" alt="<?=e($row['title'])?>" loading="lazy"><?php else:?><span class="muted">Legacy image file unavailable</span><?php endif;?></td><td><strong><?=e($row['title']?:($row['photo']?:'Untitled photo'))?></strong><p class="cell-description"><?=e($row['description'])?></p></td>
<?php else:?><td><a class="record-name" href="<?=e($view)?>.php?id=<?=(int)$row['id']?>"><?=e($row['name'])?></a><small>#<?=(int)$row['id']?> &middot; <?=e($row['payment_method']??'Registration')?><?=($row['gateway_mode']??null)==='test'?' &middot; TEST PAYMENT':''?></small></td><td><?=e($row['email'])?><small><?=e($row['phone']?:'No phone supplied')?></small></td><td><?php if($view==='donations'):?>₹<?=e(number_format((float)$row['amount'],2))?><small><?=e($row['payment_method']==='razorpay'?($row['razorpay_order_id']??'Order pending'):($row['payment_reference']?:'No reference supplied'))?></small><?php else:?><?=e($row['role']??$row['interest'])?><?php endif;?></td><td><span class="badge badge-<?=e($row['payment_status']??$row['status'])?>"><?=e(isset($row['payment_status'])?(['paid'=>$row['payment_method']==='razorpay'?'Paid':'Verified','failed'=>$row['payment_method']==='razorpay'?'Failed':'Rejected'][$row['payment_status']]??ucfirst($row['payment_status'])):ucfirst($row['status']))?></span></td><?php endif;?>
<td><time><?=e(date('d M Y',strtotime($row['created_at'])))?></time><small><?=e(date('H:i',strtotime($row['created_at'])))?></small></td>
<td><div class="row-actions"><a class="action-link" href="<?=e($view)?>.php?id=<?=(int)$row['id']?>"><?=$view==='gallery'?'View / Edit':'View / Manage'?></a><?php if($view==='donations'&&($row['payment_screenshot_path']??null)):?><a class="action-link" href="donation-proof.php?id=<?=(int)$row['id']?>" target="_blank" rel="noopener noreferrer">Screenshot</a><?php endif;?><?php if($view==='career'):?><a class="action-link" href="resume.php?id=<?=(int)$row['id']?>">Resume</a><?php endif;?>
<details class="delete-details"><summary class="<?=$scope==='archived'?'restore-link':'danger-link'?>"><?=$scope==='archived'?'Restore':'Delete'?></summary><form method="post"><?php hidden_fields($scope==='archived'?'restore':'delete',(int)$row['id']);?>
<?php if($scope!=='archived'):?><label class="check"><input type="checkbox" name="confirm_delete" value="1" required>Move this record to the archive</label><?php else:?><p>Restore this record?</p><?php endif;?><button class="<?=$scope==='archived'?'':'danger'?>"><?=$scope==='archived'?'Confirm restore':'Confirm delete'?></button></form></details></div></td></tr>
<?php endforeach;if(!$rows):?><tr><td colspan="<?=$view==='gallery'?4:6?>"><div class="empty-state"><strong>No records found</strong><p>Try a different search or change the record filter.</p></div></td></tr><?php endif;?></tbody></table></div>
<nav class="pagination" aria-label="Record pages"><?php $pageParams=['q'=>$q,'scope'=>$scope];if($page>1):?><a href="<?=e($view)?>.php?<?=e(http_build_query($pageParams+['page'=>$page-1]))?>">← Previous</a><?php endif;?><span>Page <?=$page?> of <?=$pages?></span><?php if($page<$pages):?><a href="<?=e($view)?>.php?<?=e(http_build_query($pageParams+['page'=>$page+1]))?>">Next →</a><?php endif;?></nav></section>
<?php endif;admin_end(); ?>
