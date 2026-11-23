-- Jan Seva Sangh Trust database. No admin accounts or passwords are seeded.
-- Safe to re-import: existing tables and records are retained.
CREATE DATABASE IF NOT EXISTS janseva_ngo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE janseva_ngo_db;

-- Additive replay-safe migration. Existing site tables and rows are preserved.
CREATE TABLE IF NOT EXISTS ngo_schema_migrations (version VARCHAR(80) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ngo_admin_users (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, active TINYINT NOT NULL DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ngo_donations (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, phone VARCHAR(20) NOT NULL DEFAULT '', email VARCHAR(254) NOT NULL, amount DECIMAL(12,2) NOT NULL, payment_reference VARCHAR(150) NOT NULL DEFAULT '', payment_status ENUM('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending', verification_note TEXT NULL, verified_by BIGINT UNSIGNED NULL, verified_at DATETIME NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(verified_by) REFERENCES ngo_admin_users(id), CHECK(amount>0), CHECK(payment_status<>'paid' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL AND CHAR_LENGTH(payment_reference)>0 AND CHAR_LENGTH(verification_note)>0))) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ngo_career_applications (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL, phone VARCHAR(20) NOT NULL, role VARCHAR(100) NOT NULL, message TEXT NOT NULL, resume_path VARCHAR(100) NOT NULL, resume_name VARCHAR(200) NOT NULL, resume_mime VARCHAR(100) NOT NULL, status ENUM('new','reviewing','shortlisted','closed') NOT NULL DEFAULT 'new', admin_notes TEXT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ngo_volunteers (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL, phone VARCHAR(20) NOT NULL DEFAULT '', interest VARCHAR(150) NOT NULL, availability VARCHAR(150) NOT NULL, message TEXT NOT NULL, status ENUM('new','contacted','active','closed') NOT NULL DEFAULT 'new', admin_notes TEXT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ngo_gallery (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, title VARCHAR(150) NOT NULL, description TEXT NOT NULL, file_path VARCHAR(100) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ngo_rate_limits (bucket CHAR(64) PRIMARY KEY, started_at BIGINT NOT NULL, attempts INT NOT NULL DEFAULT 0) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ngo_audit_log (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, admin_id BIGINT UNSIGNED NOT NULL, record_type VARCHAR(30) NOT NULL, record_id BIGINT UNSIGNED NOT NULL, action VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(admin_id) REFERENCES ngo_admin_users(id)) ENGINE=InnoDB;
INSERT IGNORE INTO ngo_schema_migrations (version) VALUES ('001_admin');

-- Archive support: existing rows and files remain intact.
SET @ngo_archive_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='archived_at')=0, 'ALTER TABLE ngo_donations ADD COLUMN archived_at DATETIME NULL', 'SELECT 1');
PREPARE ngo_archive_stmt FROM @ngo_archive_sql;
EXECUTE ngo_archive_stmt;
DEALLOCATE PREPARE ngo_archive_stmt;
SET @ngo_archive_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_career_applications' AND COLUMN_NAME='archived_at')=0, 'ALTER TABLE ngo_career_applications ADD COLUMN archived_at DATETIME NULL', 'SELECT 1');
PREPARE ngo_archive_stmt FROM @ngo_archive_sql;
EXECUTE ngo_archive_stmt;
DEALLOCATE PREPARE ngo_archive_stmt;
SET @ngo_archive_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_volunteers' AND COLUMN_NAME='archived_at')=0, 'ALTER TABLE ngo_volunteers ADD COLUMN archived_at DATETIME NULL', 'SELECT 1');
PREPARE ngo_archive_stmt FROM @ngo_archive_sql;
EXECUTE ngo_archive_stmt;
DEALLOCATE PREPARE ngo_archive_stmt;
SET @ngo_archive_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_gallery' AND COLUMN_NAME='archived_at')=0, 'ALTER TABLE ngo_gallery ADD COLUMN archived_at DATETIME NULL', 'SELECT 1');
PREPARE ngo_archive_stmt FROM @ngo_archive_sql;
EXECUTE ngo_archive_stmt;
DEALLOCATE PREPARE ngo_archive_stmt;
INSERT IGNORE INTO ngo_schema_migrations (version) VALUES ('002_record_archives');

-- Private donation proof metadata. Existing donations remain unchanged.
SET @ngo_proof_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='payment_screenshot_path')=0, 'ALTER TABLE ngo_donations ADD COLUMN payment_screenshot_path VARCHAR(100) NULL', 'SELECT 1');
PREPARE ngo_proof_stmt FROM @ngo_proof_sql;
EXECUTE ngo_proof_stmt;
DEALLOCATE PREPARE ngo_proof_stmt;
SET @ngo_proof_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='payment_screenshot_mime')=0, 'ALTER TABLE ngo_donations ADD COLUMN payment_screenshot_mime VARCHAR(100) NULL', 'SELECT 1');
PREPARE ngo_proof_stmt FROM @ngo_proof_sql;
EXECUTE ngo_proof_stmt;
DEALLOCATE PREPARE ngo_proof_stmt;
SET @ngo_proof_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='payment_screenshot_name')=0, 'ALTER TABLE ngo_donations ADD COLUMN payment_screenshot_name VARCHAR(200) NULL', 'SELECT 1');
PREPARE ngo_proof_stmt FROM @ngo_proof_sql;
EXECUTE ngo_proof_stmt;
DEALLOCATE PREPARE ngo_proof_stmt;
INSERT IGNORE INTO ngo_schema_migrations (version) VALUES ('003_donation_proofs');

-- Razorpay order binding and server verification.
SET @ngo_rzp_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='payment_method')=0, 'ALTER TABLE ngo_donations ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT ''bank_transfer''', 'SELECT 1');
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
SET @ngo_rzp_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='razorpay_order_id')=0, 'ALTER TABLE ngo_donations ADD COLUMN razorpay_order_id VARCHAR(100) NULL UNIQUE', 'SELECT 1');
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
SET @ngo_rzp_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='razorpay_payment_id')=0, 'ALTER TABLE ngo_donations ADD COLUMN razorpay_payment_id VARCHAR(100) NULL UNIQUE', 'SELECT 1');
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
SET @ngo_rzp_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='gateway_mode')=0, 'ALTER TABLE ngo_donations ADD COLUMN gateway_mode VARCHAR(10) NULL', 'SELECT 1');
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
SET @ngo_rzp_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='gateway_request_key')=0, 'ALTER TABLE ngo_donations ADD COLUMN gateway_request_key CHAR(64) NULL UNIQUE', 'SELECT 1');
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
SET @ngo_rzp_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='gateway_owner_hash')=0, 'ALTER TABLE ngo_donations ADD COLUMN gateway_owner_hash CHAR(64) NULL', 'SELECT 1');
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
SET @ngo_rzp_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='gateway_expected_amount')=0, 'ALTER TABLE ngo_donations ADD COLUMN gateway_expected_amount BIGINT UNSIGNED NULL', 'SELECT 1');
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
SET @ngo_rzp_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='gateway_verified_at')=0, 'ALTER TABLE ngo_donations ADD COLUMN gateway_verified_at DATETIME NULL', 'SELECT 1');
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
SET @ngo_rzp_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND COLUMN_NAME='gateway_error')=0, 'ALTER TABLE ngo_donations ADD COLUMN gateway_error VARCHAR(200) NULL', 'SELECT 1');
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
SET @ngo_rzp_sql=IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='ngo_donations' AND CONSTRAINT_NAME='ngo_donations_paid_verification')=0, 'ALTER TABLE ngo_donations ADD CONSTRAINT ngo_donations_paid_verification CHECK (payment_status<>''paid'' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL AND CHAR_LENGTH(payment_reference)>0 AND CHAR_LENGTH(verification_note)>0) OR (payment_method=''razorpay'' AND razorpay_payment_id IS NOT NULL AND gateway_verified_at IS NOT NULL AND payment_reference=razorpay_payment_id))', 'SELECT 1');
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
SET @ngo_old_paid_check=(SELECT tc.CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS tc JOIN information_schema.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME=tc.CONSTRAINT_NAME WHERE tc.CONSTRAINT_SCHEMA=DATABASE() AND tc.TABLE_NAME='ngo_donations' AND cc.CHECK_CLAUSE LIKE '%verified_by%' AND cc.CHECK_CLAUSE NOT LIKE '%gateway_verified_at%' LIMIT 1);
SET @ngo_rzp_sql=IF(@ngo_old_paid_check IS NULL, 'SELECT 1', CONCAT('ALTER TABLE ngo_donations ',IF(LOCATE('MariaDB',VERSION())>0,'DROP CONSTRAINT ','DROP CHECK '),'`',REPLACE(@ngo_old_paid_check,'`','``'),'`'));
PREPARE ngo_rzp_stmt FROM @ngo_rzp_sql;
EXECUTE ngo_rzp_stmt;
DEALLOCATE PREPARE ngo_rzp_stmt;
INSERT IGNORE INTO ngo_schema_migrations (version) VALUES ('004_razorpay');

-- Extend an existing legacy `gallery` table without deleting prior photo rows.
CREATE TABLE IF NOT EXISTS gallery (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  photo VARCHAR(255) NOT NULL DEFAULT '',
  title VARCHAR(150) NOT NULL DEFAULT '',
  description TEXT NULL,
  file_path VARCHAR(100) NULL,
  archived_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
SET @gallery_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='title')=0, 'ALTER TABLE gallery ADD COLUMN title VARCHAR(150) NOT NULL DEFAULT ''''', 'SELECT 1');
PREPARE gallery_stmt FROM @gallery_sql;
EXECUTE gallery_stmt;
DEALLOCATE PREPARE gallery_stmt;
SET @gallery_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='description')=0, 'ALTER TABLE gallery ADD COLUMN description TEXT NULL', 'SELECT 1');
PREPARE gallery_stmt FROM @gallery_sql;
EXECUTE gallery_stmt;
DEALLOCATE PREPARE gallery_stmt;
SET @gallery_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='file_path')=0, 'ALTER TABLE gallery ADD COLUMN file_path VARCHAR(100) NULL', 'SELECT 1');
PREPARE gallery_stmt FROM @gallery_sql;
EXECUTE gallery_stmt;
DEALLOCATE PREPARE gallery_stmt;
SET @gallery_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='archived_at')=0, 'ALTER TABLE gallery ADD COLUMN archived_at DATETIME NULL', 'SELECT 1');
PREPARE gallery_stmt FROM @gallery_sql;
EXECUTE gallery_stmt;
DEALLOCATE PREPARE gallery_stmt;
SET @gallery_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='created_at')=0, 'ALTER TABLE gallery ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE gallery_stmt FROM @gallery_sql;
EXECUTE gallery_stmt;
DEALLOCATE PREPARE gallery_stmt;
INSERT IGNORE INTO ngo_schema_migrations (version) VALUES ('005_existing_gallery_table');
