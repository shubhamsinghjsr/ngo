<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}require __DIR__.'/../backend/bootstrap.php';
// MySQL DDL commits implicitly: all statements can be replayed, version recorded last.
foreach(['001_admin.sql','002_record_archives.sql','003_donation_proofs.sql','004_razorpay.sql','005_existing_gallery_table.sql'] as $migration) { foreach(explode(';',file_get_contents(__DIR__.'/../migrations/'.$migration)) as $sql){if(trim($sql)!==''){ $statement=db()->query($sql);$statement->closeCursor(); }}
}
echo "Migrations applied. Existing rows preserved.\n";
