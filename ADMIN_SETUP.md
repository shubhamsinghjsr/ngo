# NGO admin setup (PHP 8.1+ and MySQL 8 / MariaDB 10.4+)

The existing HTML site, navigation, donation bank details, QR configuration, WhatsApp and photo lightbox remain intact. Career, volunteer and donation-record forms now call PHP; other enquiry forms remain explicitly marked demos. No payment gateway is enabled.

## 1. XAMPP and private configuration

Start Apache and MySQL in XAMPP. Enable PHP extensions pdo_mysql and fileinfo. ZIP is required for DOCX resume validation. Gallery uploads do not require GD. Configure upload_max_filesize = 6M and post_max_size = 8M in php.ini; restart Apache after changes.

The local database janseva_ngo_db and its dedicated database user have been created. For a fresh installation, import database/schema.sql in phpMyAdmin. The schema preserves existing tables and rows. See database/README.md for exact import steps. Do not use a blank-password root account for deployment. Back up an existing database before migrations.

The current private configuration is C:/xampp/ngo-private/config.php, outside htdocs. It already contains the working dedicated database credentials: preserve it. For a fresh installation, create an equivalent file using your own credentials. Never place this file or resume storage in the public project:

```php
<?php
return [
  'NGO_DB_HOST' => '127.0.0.1',
  'NGO_DB_PORT' => '3306',
  'NGO_DB_NAME' => 'janseva_ngo_db',
  'NGO_DB_USER' => 'REPLACE_WITH_DATABASE_USER',
  'NGO_DB_PASSWORD' => 'REPLACE_WITH_DATABASE_PASSWORD',
  'NGO_PRIVATE_DIR' => 'C:/xampp/ngo-private',
  'NGO_BASE_PATH' => '/ngo',
];
```

Alternatively set these environment variables for Apache and CLI. NGO_CONFIG_FILE may point to a different private configuration file. Production storage must be outside the actual DocumentRoot; grant access only to the PHP service account and administrators. The code rejects storage beneath the XAMPP htdocs parent. On other hosting layouts, configure a truly private directory and restrict server aliases.

## 2. Run the versioned migration

In PowerShell:

```powershell
Set-Location C:\xampp\htdocs\ngo
& C:\xampp\php\php.exe scripts/migrate.php
```

Migration migrations/001_admin.sql is additive, uses ngo_ table names, contains no destructive statements, and can be run again without replacing records. It creates tables for admins, donations, applications, volunteers, gallery, audit history, rate limits and migration tracking. Migration 002_record_archives.sql adds nullable archive timestamps without deleting or replacing records. Applying this migration to an older database requires a database administrator with ALTER permission; the application user permissions were not expanded. The local database migration has already been applied. MySQL DDL commits implicitly; if interrupted, rerun the migration.

## 3. Create the first admin (no default account)

Run the following in PowerShell. Replace the email with your own admin login. The password is entered using a hidden prompt and is not a command argument:

```powershell
Set-Location C:\xampp\htdocs\ngo
$adminEmail = Read-Host 'Admin email'
$adminSecret = Read-Host 'Admin password (12–72 characters)' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecret)
try {
  $plainAdminSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  $plainAdminSecret | & C:\xampp\php\php.exe scripts/create-admin.php $adminEmail
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  Remove-Variable plainAdminSecret,adminSecret -ErrorAction SilentlyContinue
}
```

Passwords are hashed with password_hash; authentication uses password_verify. There is no web-based installer or default admin password. scripts/ is denied through Apache .htaccess and CLI scripts also reject HTTP execution.

## 4. Access and operate

- Website: http://localhost/ngo/index.html
- Admin login: http://localhost/ngo/admin/login.php
- Dashboard: totals and verified donation amount. Records are shown on their dedicated section pages.
- Donations: edit donor details, amount, reference and status. Public submissions ALWAYS start pending. To save paid, verify externally using an actual bank statement/gateway record, enter a reference and a verification note (at least 10 characters), and confirm the verification checkbox. This is manual verification, not automatic payment processing. Verification metadata and an audit event are recorded.
- Career / volunteers: open a record, update its status and internal notes. Resume downloads require admin authentication; files are never exposed under htdocs.
- Gallery: upload JPG/PNG/WebP up to 5 MB, edit title/description or replace image, and delete with explicit confirmation. Public gallery displays database-published photographs only. Existing local image assets remain on disk but are not used as gallery substitutes.
- Log out using the POST logout button. Sessions expire after 30 minutes of inactivity.

Admin uses CSRF tokens, HttpOnly/SameSite cookies, regenerated login session IDs, database-backed rate limits, escaped output and prepared SQL statements. Require HTTPS in production for secure cookies. File format checks are not antivirus scanning: add a malware-scanning service before production resume processing if required. PDF/DOC documents are served only as authenticated downloads, never embedded or executed.

The local database and private connection settings are configured. No admin account or gateway secrets are seeded or committed. On a fresh installation, until configuration and schema import are complete, real submissions show a service error instead of a false success. Opening HTML through file:// cannot submit to PHP.

## Files

- admin/: dashboard/records/gallery management, login, logout and resume download.
- backend/: private configuration loader, PDO/session/validation helpers and upload validation.
- api/: form submissions, gallery list and image delivery.
- database/schema.sql and database/README.md; migrations/001_admin.sql; scripts/migrate.php; scripts/create-admin.php.
- assets/js/backend.js; assets/js/gallery-backend.js.
- Updated career.html, volunteer.html, donate.html, gallery.html and the existing JS submission handlers.

## Recovery and backups

Back up the database together with the private resumes/gallery directory. No application/volunteer deletion is exposed; close records through their status. Delete actions archive records and retain files. Choose Archived records on the relevant page to restore a record. Archived gallery photos are hidden from public listings and public image delivery. Do not import or expose test data as real Trust records.

## Verification

All PHP and modified JavaScript files passed syntax checks. The latest isolated integration/browser suite passed 187 checks at 390, 768 and 1440 pixels, including actual frontend volunteer, career/resume and donation submissions. Test accounts, donations, applications, gallery photos, database and private upload files are removed after testing. The local janseva_ngo_db is configured with a dedicated database user. The first admin is intentionally not provisioned with test credentials. The gallery suite also runs with GD disabled, matching local Apache. Enable ZIP in php.ini for DOCX resume validation.

Security references: [PHP password_hash](https://www.php.net/manual/en/function.password-hash.php), [PHP session cookie parameters](https://www.php.net/manual/en/function.session-set-cookie-params.php).

## Change admin login details

After login, select **Account settings** in the admin navigation, or open http://localhost/ngo/admin/account.php. Enter the desired login email and your current password. To change the password, also fill the new-password and confirmation fields (12?72 bytes). Leave both empty to change only the email. Saving requires current-password verification and CSRF validation. Passwords are hashed, changes are audited, and old admin sessions are invalidated; sign in again with the updated details. Your configured account is jansevaadmin@gmail.com. No plaintext admin password is stored in project files or this guide.

## Admin page navigation

The desktop sidebar remains visible. On mobile/tablet, open it with the menu button and close it with the overlay or Escape.

- Dashboard: http://localhost/ngo/admin/index.php
- Donations: http://localhost/ngo/admin/donations.php
- Career Applications: http://localhost/ngo/admin/career.php
- Volunteer Registrations: http://localhost/ngo/admin/volunteers.php
- Gallery: http://localhost/ngo/admin/gallery.php
- Account settings: http://localhost/ngo/admin/account.php

Each record page has server-side search, pagination (25 records per page), active/archive filters and record actions. View/Manage opens the existing management form. Gallery images have private admin previews, upload/replacement and title/description editing. Delete requires confirmation and archives the record without deleting its data or files; Restore returns it to the active view. All mutations use POST, session authentication, CSRF tokens and audit events. Existing index.php?view=... bookmarks redirect to the dedicated pages, and legacy POST integrations remain supported. Existing local gallery images remain unchanged.

## Gallery upload fix

The Apache error log reported Call to undefined function imagecreatefromstring() because GD was disabled. Gallery upload now validates extension, Fileinfo MIME, dimensions and size, preserves the original JPG/PNG/WebP bytes in private storage, and serves them only through api/photo.php with the correct image MIME and nosniff headers. GD is not needed. Failures in PHP upload, private storage or database persistence show inline messages; failed inserts roll back and clean up only the newly created file. Editing an image retains the previous private file. Public gallery renders uploaded database records only; static gallery display grids were removed without deleting their local image assets.

## Donation proof review

The public Donate form requires donor name, phone, whole-rupee amount, UTR/transaction reference and a JPG/PNG/WebP payment screenshot up to 5 MB (20 megapixels). Email is optional. All submissions are Pending. A successful submission acknowledges review only and does not confirm a payment or issue a receipt. Server validation, CSRF, honeypot, consent and database-backed per-IP rate limits are enforced.

Screenshots are stored in C:/xampp/ngo-private/payment-proofs/ under random filenames, with path/MIME/original-name metadata in ngo_donations. The folder is outside htdocs. admin/donation-proof.php requires an active admin session, checks the raster MIME and uses no-store/nosniff headers. Screenshots never appear in the public Gallery. Database insert failures roll back and remove only the newly uploaded orphan file.

Open Admin ? Donations ? View / Manage, then View private payment screenshot. Mark Verified only after checking the actual bank/gateway transaction and entering a verification note with the confirmation checkbox. Mark Rejected with a reason (10+ characters). Existing database values paid/failed are displayed as Verified/Rejected, preserving old records and dashboard totals. Cancelled remains available for existing workflows.

Migration 003_donation_proofs.sql adds three nullable screenshot metadata columns and has already been applied locally. database/schema.sql includes it for fresh imports and safe re-imports. No existing records or database user permissions were overwritten.

The official QR image is not yet supplied. Add only an approved Trust QR at assets/images/donation-qr.png and set NGO_CONFIG.donationQR.confirmed to true in assets/js/config.js. This enables QR display, not automatic payment verification. Existing bank-transfer details remain available.

All public page footers and admin page footers include the linked credit Designed and Developed by TechCoder Software Pvt. Ltd., opening https://techcoderservice.in/ in a new tab with noopener/noreferrer.

## Razorpay online payment

Razorpay Test Mode is integrated alongside QR/bank transfers. Add the real Test/Live keys only in C:/xampp/ngo-private/config.php or server environment settings; no secret belongs in browser code. Follow [RAZORPAY_SETUP.md](RAZORPAY_SETUP.md) for exact key names, capture settings, signed webhooks, Test Mode checkout and the live switch. Migration 004_razorpay is applied locally. Online payments stay Pending until signature and captured-payment/order/amount/currency checks pass. Test payments are labelled and excluded from real donation totals.

Razorpay integration validation: 193 regression/browser checks and 36 isolated payment-security checks passed. Actual Razorpay sandbox Checkout still requires the account-specific Test Mode keys. No real provider payment was attempted.
