<?php
declare(strict_types=1);require __DIR__.'/../backend/uploads.php';admin();
// Existing bookmarked URLs and POST integrations remain compatible.
if(isset($_GET['view'])&&$_GET['view']!=='dashboard'){
 $allowed=['donations','career','volunteers','gallery'];
 if(!is_string($_GET['view'])||!in_array($_GET['view'],$allowed,true)){http_response_code(404);exit;}
 $view=$_GET['view'];
 if($_SERVER['REQUEST_METHOD']==='POST'){require __DIR__.'/records.php';exit;}
 $params=$_GET;unset($params['view']);header('Location: '.$view.'.php'.($params?'?'.http_build_query($params):''));exit;
}
require __DIR__.'/layout.php';admin_start('Dashboard','dashboard');
$types=['donations'=>['Donations','ngo_donations'],'career'=>['Career Applications','ngo_career_applications'],'volunteers'=>['Volunteer Registrations','ngo_volunteers'],'gallery'=>['Gallery uploads','gallery']];
?>
<p class="page-intro">A clear overview of your Trust’s records. Open a section to search and manage its data.</p><div class="cards"><?php foreach($types as $key=>[$label,$table]):?><a class="stat-card" href="<?=e($key)?>.php"><span><?=e($label)?></span><strong><?=e(query('SELECT COUNT(*) FROM '.$table.' WHERE archived_at IS NULL')->fetchColumn())?></strong><small>View records <span aria-hidden="true">↗</span></small></a><?php endforeach;?></div>
<section class="panel donation-summary"><div><p class="eyebrow">VERIFIED CONTRIBUTIONS</p><h2>₹<?=e(number_format((float)query("SELECT COALESCE(SUM(amount),0) FROM ngo_donations WHERE payment_status='paid' AND archived_at IS NULL AND (gateway_mode IS NULL OR gateway_mode='live')")->fetchColumn(),2))?></h2><p class="muted">Only verified, active real donation records are included. Test payments are excluded.</p></div><a class="button" href="donations.php">Manage donations</a></section>
<section class="panel"><h2>Keep your workspace up to date</h2><p>Review applications, follow up on volunteer registrations and publish gallery photographs from their dedicated pages. Deleted records are retained in each section’s archive and can be restored.</p><a href="account.php">Manage your login details →</a></section>
<?php admin_end(); ?>
