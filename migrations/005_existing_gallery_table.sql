-- Add admin-gallery fields to the existing `gallery` table without removing legacy rows.
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
