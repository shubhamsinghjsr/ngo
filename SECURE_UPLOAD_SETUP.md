# Private resume uploads

The PHP/MySQL career backend is now implemented. See [ADMIN_SETUP.md](ADMIN_SETUP.md) for configuration, migration, admin creation and server requirements.

Applications are submitted via `api/forms.php`. Required fields, consent, CSRF, honeypot, database-backed rate limits, file size, extension, MIME and content checks are enforced server-side. PDF, DOC and DOCX files up to 5 MB are stored under the configured private directory outside the web root.

`admin/resume.php` authenticates the admin and streams a download attachment; no public resume URL is generated. Upload format validation does not establish that a document is malware-free. Add a malware-scanning service and an appropriate retention policy before production use.
