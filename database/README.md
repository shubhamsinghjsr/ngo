# Jan Seva Sangh Trust database setup

## Current local installation

The database janseva_ngo_db has been created and database/schema.sql has been imported. PHP connects through a dedicated database user. Its generated database password is kept only in C:/xampp/ngo-private/config.php, outside the public htdocs directory. Archive migration 002 has also been applied locally. Existing records are retained, and admin Delete actions are reversible through the archive filter. The schema does not seed admin accounts or default passwords. The locally configured admin login is jansevaadmin@gmail.com; its password is stored only as a hash. Use Account settings after login to change your email or password.

The database name is loaded in backend/bootstrap.php using:
`setting('NGO_DB_NAME', 'janseva_ngo_db')`

The private config sets NGO_DB_NAME to janseva_ngo_db. Environment variables take precedence. Preserve the existing private config; do not replace its credentials with documentation placeholders.

Tables:
- ngo_admin_users: admin email, password hash and active flag.
- ngo_donations: donor details, amount, reference, pending/paid status and verification metadata.
- ngo_career_applications: application details, private resume filenames, status and notes.
- ngo_volunteers: registrations, status and notes.
- ngo_gallery: uploaded photo titles, descriptions and private image filenames.
- ngo_schema_migrations, ngo_rate_limits, ngo_audit_log: version tracking and security support.

Existing table names are retained so the admin panel and PHP API continue to work.

## Import in phpMyAdmin (fresh installation or safe re-import)

1. Start Apache and MySQL from XAMPP.
2. Open http://localhost/phpmyadmin.
3. Choose the Import tab at the server level, or select janseva_ngo_db and then Import.
4. Choose C:/xampp/htdocs/ngo/database/schema.sql.
5. Leave format as SQL and click Import/Go.
6. Confirm that janseva_ngo_db contains the eight tables listed above.

The SQL creates the database and tables only if absent and preserves records. It does not contain DROP, TRUNCATE, credential seeds or destructive replacements. It does not alter an incompatible pre-existing table schema. Back up an existing database before importing changes.

The existing scripts/migrate.php runner remains available for applying migration 001_admin with the private PHP configuration.

## Create your first admin safely

In PowerShell, run this block. Enter your own email and a new password at the hidden prompt. No password is supplied as a command argument or saved in the project.

```powershell
Set-Location C:\xampp\htdocs\ngo
$adminEmail = Read-Host 'Admin email'
$adminSecret = Read-Host 'Choose an admin password (12–72 ASCII characters)' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecret)
try {
    $plainAdminSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    $plainAdminSecret | & C:\xampp\php\php.exe scripts/create-admin.php $adminEmail
    if ($LASTEXITCODE -ne 0) { throw 'Admin creation failed. Check the displayed error.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    Remove-Variable plainAdminSecret,adminSecret -ErrorAction SilentlyContinue
}
```

The PHP script hashes the password with password_hash before insertion. It never stores plaintext passwords and will not overwrite an account that already uses the same email. The CLI installer rejects HTTP requests.

## Open locally

- Website: http://localhost/ngo/index.html
- Admin login: http://localhost/ngo/admin/login.php
- Dashboard after login: http://localhost/ngo/admin/index.php

Use the email and password you just chose. Resumes stay outside htdocs. Donations start pending and require verified payment evidence before an admin marks them paid.

Gallery uploads require no GD extension. Enable PHP ZIP in C:/xampp/php/php.ini and restart Apache for DOCX resume validation. See ADMIN_SETUP.md for complete server and upload requirements.

## Donation screenshots

Migration 003_donation_proofs.sql is applied locally and included in schema.sql. It adds nullable payment_screenshot_path, payment_screenshot_mime and payment_screenshot_name columns to existing ngo_donations rows. Screenshot files stay in the private payment-proofs upload folder, not as public images. New records are Pending; admin-visible Verified/Rejected map to the preserved paid/failed database states. Screenshots require admin authentication to view.

Migration 004_razorpay adds order/payment IDs, mode and server-verification metadata without replacing existing rows. Online payment status is controlled by verified provider callbacks/webhooks; existing QR/bank transfer review remains available. See ../RAZORPAY_SETUP.md for private server configuration.
