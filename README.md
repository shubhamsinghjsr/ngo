# Jan Seva Sangh Trust — local animal NGO website

HTML5 / CSS3 / Vanilla JavaScript public website with a PHP/MySQL admin backend. No frontend framework or build is required. This is a local project; it has not been deployed.

## Run locally

Start Apache and MySQL in XAMPP, follow [ADMIN_SETUP.md](ADMIN_SETUP.md), then open http://localhost/ngo/index.html. Admin login: http://localhost/ngo/admin/login.php. File previews still show the site, but real form submission and database gallery updates require PHP. No npm install is needed.

## Project structure

```text
index.html                          Home
about.html                          History, mission, vision, animal-welfare overview, certificates
core-members.html                   Ten editable core-member profiles
projects.html                       Seven programmes and published rescue stories
awards.html                         Seven awards with local images, years and descriptions
volunteer-journey.html               Dedicated volunteer journey and timeline
veterinary-care-adoption.html       Care, adoption/foster information and rescue contacts
career.html                         Roles and private resume application
donate.html                         Bank transfer, copy details, QR placeholder, gateway demo
gallery.html                        Photo grid and lightbox
volunteer.html                      Opportunities and backend registration
animal-welfare-course.html          Unconfirmed course enquiry
january-2025-volunteers.html        Archive status pending a verified report
veterinary-doctors.html             Dedicated Doctors page and professional enquiry
CONTENT_SOURCES.md                  Verified sources, conflicts and outstanding details
SECURE_UPLOAD_SETUP.md              Private backend requirements for real resume uploads
assets/
  css/style.css                     Shared responsive styles
  js/config.js                      Public integration configuration
  js/main.js                        Navigation, forms, donation UI, lightbox
  js/donation.js                    Bank-copy controls and approved-QR display/fallback
  js/people-data.js                  Editable core-member and doctor profiles
  js/people.js                       Safe profile rendering and photo fallbacks
  js/resume-validation.js            PDF/DOC/DOCX size, type and structure checks
  js/career.js                       Browser resume validation (submission in backend.js)
  images/                           Local Trust photos, retained stock photos and mark.svg
    trust-sources.json              Exact source URLs for downloaded Trust photos
    logo.png                        Add your own logo here (optional)
```

## Update content and photos

Content from Jan Seva Sangh Trust's public pages was checked on 12 October 2026. The original nine pages are retained and improved; five previously combined sections now have dedicated pages, for 14 total pages. All 12 requested sections have distinct URLs. The existing volunteer-opportunities page and January archive are also retained. Review `CONTENT_SOURCES.md` for exact source links, separately scoped statistics, conflicting facility dates and unverified details. Course dates/fees/accreditation, January 2025 activity details and current career openings remain unconfirmed. Add them only after receiving approved information. Source-reported certificate identifiers are displayed without guaranteeing current tax eligibility. Footer contact details are repeated in each page to keep the site usable without JavaScript.

## Page URLs

| Section | Local URL |
| --- | --- |
| Home | `index.html` |
| About Us | `about.html` |
| Volunteer / Core Members | `core-members.html` |
| Doctors | `veterinary-doctors.html` |
| Projects | `projects.html` |
| Awards | `awards.html` |
| Career | `career.html` |
| Donate | `donate.html` |
| Gallery | `gallery.html` |
| Animal Welfare Certificate Course | `animal-welfare-course.html` |
| Volunteer Journey | `volunteer-journey.html` |
| Veterinary Care and Adoption | `veterinary-care-adoption.html` |

Every header links to these pages. The Volunteer dropdown includes opportunities, Core Members, Doctors, Volunteer Journey and Veterinary Care & Adoption; the News & Updates dropdown retains the certificate course and existing archive links. Previously shared section links such as `about.html#projects` and `volunteer.html#core-members` redirect to the new dedicated pages when JavaScript is enabled. Current internal links use the new page URLs directly.

The existing logo path remains `assets/images/logo.png`; a heart mark appears if it is missing. Twenty-one source photos are stored as `trust-*.jpg`, including all seven published award images. Their original URLs are listed in `assets/images/trust-sources.json`. Retained stock photos are labelled separately from Trust activity photos. Update alt text, captions and `data-caption` values together when replacing images. Missing images show clean gradient placeholders. No source image is hotlinked.

## Profiles, projects and awards

Edit `assets/js/people-data.js`: fill each core member's `name`, `role`, `story` and `photo`. Ten slots are supplied; only founder Suraj Kumar has verified name/role/background. His individual portrait and all other member details await approved information. Photo paths should look like `assets/images/members/member-01.jpg` (PNG, JPEG or WebP; simple filenames without spaces). Missing/invalid photos show a neutral portrait placeholder. No person is identified from the group photo.

Fill the `doctors` array with approved names, qualifications, specializations, roles, biographies and local photos. Add/remove objects to match the actual roster; the three empty entries are editable slots, not a verified doctor count. Text is rendered using text nodes, and remote/traversal photo paths are rejected. The existing veterinary page is the Doctors destination; no duplicate doctor page has been added.

Profiles appear in `core-members.html` and `veterinary-doctors.html`. Projects and Awards now have their own pages: `projects.html` and `awards.html`. Edit those existing HTML cards to update approved programme details. Seven source-supported programmes have Learn More/Support links. Missing programme photographs use a local illustration. Seven awards show their published image, title, year, presenter and short description. Volunteer milestones appear in `volunteer-journey.html`; clinical care/adoption content is in `veterinary-care-adoption.html`. About and Home provide summaries and links instead of repeating those full sections.

## WhatsApp and navigation

The official primary contact is already configured as `917707007005` in `assets/js/config.js` under `whatsapp`. It uses an encoded pre-filled message and a valid `https://wa.me/` link. All 14 HTML pages contain a matching static fallback link. If the verified number changes, update the config plus static fallback/contact links in those pages. The fixed icon lives in a reserved bottom rail; the scrollable website area ends above it, so mobile controls are not obscured. Dropdowns support click/touch, arrow keys, Home/End, Escape and normal Tab navigation.

## Bank transfer and official payment QR

The Donate page displays exactly the supplied details: Jan Seva Sangh Trust; account `41459651525`; IFSC `SBIN0009009`; SBI, Baridhi (Jamshedpur); Current account. The bank account, IFSC, bank and account type also matched the source Support page during verification. Copy Account Details uses the Clipboard API or a copy fallback, with visible manual-selection text if copying is denied. Receipts and bank-transfer confirmation must come from the Trust; the website does not verify transfers.

No approved payment QR image was present in this checkout. The Donate page therefore shows a labelled upload placeholder that cannot make a payment. No decorative or unverified QR code was generated.

To display the official payment QR:

1. Add the Trust's approved image as `assets/images/donation-qr.png` (or configure another local PNG/JPEG/WebP path).
2. In `assets/js/config.js`, set `donationQR.confirmed` to `true` and ensure `donationQR.image` matches that path.
3. Reload Donate and verify the actual official QR in a payment app. If the image cannot load, the placeholder stays visible with a clear message.

An official payment QR is intentionally a public asset; applicant resumes must remain private. Adding a QR does not enable the gateway demo or automatic receipt verification.

## Forms

Career, volunteer and donation-record forms are connected to the PHP/MySQL backend. Configure the private database settings and run the migration before accepting submissions. Career resumes are stored outside the web root and downloaded only by authenticated admins. Public donations are recorded as pending and do not process payment. Course and other enquiry forms remain clearly marked frontend demos. See [ADMIN_SETUP.md](ADMIN_SETUP.md) for setup, storage and security details.

## Payment integration contract

Online gateway checkout remains unavailable and intentionally does not display a payment-success message. Bank-transfer details are displayed separately. `assets/js/config.js` contains public endpoint placeholders only. Changing `enabled` does not activate a gateway: implement and test the server and checkout adapter first.

1. Select your gateway and extend the existing PHP backend. Configure `PAYMENT_KEY_ID`, `PAYMENT_KEY_SECRET` and `PAYMENT_WEBHOOK_SECRET` in the backend host's environment/secret manager. NEVER put secret keys, payment credentials or private identifiers in HTML, browser JS, Git or query parameters.
2. Implement `POST /api/donations/create-order`: accept `{amount, currency: "INR", donor: {name, email, phone}}`. Validate amount and donor data server-side, set currency server-side, convert whole rupees to minor units, generate an idempotent donation record and create the provider order with server credentials. Return only provider-approved public checkout values and an order identifier. Do not trust a client amount for a later verification call.
3. Add the provider's official checkout adapter to `main.js` and update the public endpoint paths in `config.js`. Serve over HTTPS. Do not collect card details yourself. Disable repeated submissions while requests are pending and show accurate cancellation/error states.
4. Implement `POST /api/donations/verify` to validate provider signatures and match the stored order, currency and amount. A browser callback alone is not evidence of payment. Verify signed webhooks using the backend webhook secret, handle retries idempotently, and issue receipts only after verified settlement/capture according to your gateway's rules.
5. Publish verified donation eligibility, refund policy, privacy terms and NGO registration information. Run sandbox success, failure, cancellation, timeout and duplicate-webhook tests before live activation. Update the payment notice and checkbox only when real integration is ready.

## Current backend checks

The PHP/MySQL integration suite uses an isolated temporary database and uploads, then cleans them up. Run `node tests/integration.mjs` on XAMPP with Node.js and Edge available. It checks migrations, login/logout, CSRF, private resume uploads/downloads, donor verification, volunteer records, gallery management and desktop/tablet/mobile browser rendering. See ADMIN_SETUP.md for the latest results.

## Earlier static-site checks

After the dedicated-page update, **344 browser checks passed** across all 14 pages at 320, 390, 768, 1024 and 1440 pixels: layouts, WhatsApp clearance/URLs, dropdowns, keyboard focus/Escape and local images. Actual mobile taps verified navigation to Core Members. Dedicated pages and legacy section redirects were checked. Exact bank details, successful copy feedback, manual-copy fallback and the non-scannable QR placeholder passed. PDF/DOC/DOCX fixture validation, invalid/oversized/unsafe-archive rejection, career demo submission, preserved volunteer/course/professional/donation forms and gallery modal/focus restoration passed. No JavaScript exceptions or HTTP submissions/hotlinks were observed. Desktop/mobile screenshots were inspected.

Static checks verified local links/anchors, unique IDs, image alt text, all requested destinations, preserved existing form markup (apart from the clarified gateway demo notice), unchanged career validation scripts/profile data, unchanged payment settings and unchanged logo handling. JavaScript syntax checks passed. Resume fixtures and screenshots were stored in the operating system's temporary directory, outside public website assets.

Before publishing, also manually review your final content, keyboard focus and Escape handling, missing-image fallback, and any backend/payment integration you add.

## MySQL database

The local database is `janseva_ngo_db`. Its complete, additive import file is [database/schema.sql](database/schema.sql). PHP loads its private connection settings from `C:/xampp/ngo-private/config.php`; `backend/bootstrap.php` provides the database-name fallback. No admin account or default password is seeded. Follow [database/README.md](database/README.md) to import the schema, create your own admin with a hidden password prompt and open the local admin panel.

## Admin design update

The admin panel now uses a shared responsive sidebar and separate Dashboard, Donations, Career Applications, Volunteer Registrations and Gallery pages. Lists support server-side search, active/archive filters, pagination and recoverable deletion. Login and Account settings remain connected to janseva_ngo_db. The additive archive migration was applied locally, preserving existing rows and files. See ADMIN_SETUP.md for page URLs and controls. The latest isolated browser/integration suite passed 142 checks.

## Gallery upload and display

Gallery photos are validated and saved as their original JPG/PNG/WebP files in private storage, with database metadata and image-only delivery through api/photo.php. The public Gallery displays database-published images only, with no hard-coded stock or substitute images. Uploads work with GD disabled. Admin failures show inline feedback; database failures roll back without changing existing records. The latest GD-disabled suite passed 142 checks, including byte-for-byte image delivery and real browser upload/lightbox tests. Live Apache image delivery was also verified read-only.

## Donation proof submissions and footer credit

The Donate form now accepts donor name, phone, amount, UTR and a private payment screenshot; email is optional. Every new donation remains Pending until an admin verifies its bank/gateway transaction. Admin Donations offers private screenshot viewing and Verified/Rejected review controls. Migration 003_donation_proofs.sql has been applied without replacing existing data. All 14 public pages and the admin layout/login include the linked TechCoder footer credit. The current integration/browser suite passed 187 checks. See ADMIN_SETUP.md for proof storage and official QR configuration.

## Razorpay online payment

Razorpay Test Mode is integrated alongside QR/bank transfers. Add the real Test/Live keys only in C:/xampp/ngo-private/config.php or server environment settings; no secret belongs in browser code. Follow [RAZORPAY_SETUP.md](RAZORPAY_SETUP.md) for exact key names, capture settings, signed webhooks, Test Mode checkout and the live switch. Migration 004_razorpay is applied locally. Online payments stay Pending until signature and captured-payment/order/amount/currency checks pass. Test payments are labelled and excluded from real donation totals.

Razorpay integration validation: 193 regression/browser checks and 36 isolated payment-security checks passed. Actual Razorpay sandbox Checkout still requires the account-specific Test Mode keys. No real provider payment was attempted.
