# Content provenance and review notes

Reviewed on **12 October 2026 (Asia/Calcutta)**. Facts below are checked against the Trust's own published pages, not independently audited activity records or government registers. Text is rewritten in clear English; source quotations and founder testimonials are not copied.

## Source coverage

| Source | Content integrated |
| --- | --- |
| [Homepage](https://jansevasanghtrust.com/) | Introduction, Jamshedpur context, homepage impact figures, volunteer and donation calls to action |
| [About](https://jansevasanghtrust.com/about.html) | Establishment date, founder, registration and certificate identifiers, mission and vision |
| [What We Do](https://jansevasanghtrust.com/what_we_do.html) | Rescue, treatment, shelter, rehabilitation, adoption/fostering, vaccination, therapy and outreach; selected journey milestones |
| [Impact](https://jansevasanghtrust.com/impact.html) | Separately labelled cattle/community figures and Laxmi/Moti success stories |
| [Awards](https://jansevasanghtrust.com/awards.html) | Seven award names, years and presenting organisations; seven award photographs |
| [Rescue Stories](https://jansevasanghtrust.com/rescue.html) | Sakchi, Telco and Sonari cow-care reports; three corresponding photographs |
| [Gallery](https://jansevasanghtrust.com/galary.php) | Ten photographs, locally downloaded; visible-scene captions |
| [Contact](https://jansevasanghtrust.com/contect.php) | Rescue contacts, email, location, office/visitor hours, flexible volunteer timing and response availability |
| [Support](https://jansevasanghtrust.com/saport.html) | Donation enquiries and the exact user-supplied bank details, matched against the source |

Both domain versions were checked. Direct HTTPS requests to the non-www and www root, About, What We Do, Impact, Awards and Gallery returned HTTP 200 with matching relevant information. The browsing cache initially showed “Website Down” for the www root; direct retrieval disproved that cached state at the time of this work. No additional distinct content was found in the corresponding www pages.

The source navbar points to `saport.html` and `contect.php`. The homepage's gallery CTA points to `resqu.php`, which returned homepage content rather than a gallery. `galary.php` contains the actual gallery. `support.html`, `contact.html` and `contect.html` also returned homepage content, so they were not used as contact/donation evidence. Local navigation uses existing local pages instead of these source routes.

## Figures kept separate

| Source scope | Published figure | Handling |
| --- | --- | --- |
| Homepage | 7,000+ animals rescued; 5,000+ treatments; 300+ volunteers | Home displays these three figures, with no reporting period claimed |
| Homepage | 9+ years serving | Omitted as a stale relative age; establishment date is used instead |
| Impact page: cattle | 2,500+ cattle rescued since 2016; 300+ surgeries for injured/ill cattle | About displays separately; surgery reporting period is not specified |
| Impact page: community | 120+ awareness drives | About displays with its own category and unspecified reporting period |
| Impact page: community | 2,000+ people served; 500+ student volunteers | Not imported; these are different populations from homepage volunteer/animal totals |
| Impact page | 10 blood donation camps in the main figures, 10+ in community figures | Not imported; inconsistent precision is not reconciled |
| What We Do | More than 300 animals helped in 2019; more than 500 rescued and three blood drives in 2024 | Not added to any cumulative total; unnecessary annual counts omitted |

All figures remain source-reported. No totals, growth rates or new statistics have been calculated. The difference between 300+ volunteers and 500+ student volunteers is recorded here rather than silently selecting one as a universal total.

## Timeline and availability conflicts

- About dates the temporary Dalma recovery centre to 2021 and permanent rehabilitation construction to 2022. What We Do dates those stages to 2022 and 2023 respectively. The website describes both developments without assigning conflicting dates. Confirm with the Trust before adding dates.
- About mentions feeding drives in 2020, while What We Do describes earlier feeding/community work. This integration says feeding continued during the 2020 lockdown; it does not claim feeding first began then.
- The Impact page advertises a 24x7 cow ambulance, but Contact says emergency rescues are available “When Possible.” Contact's narrower availability wording is used throughout; no guaranteed round-the-clock response or ambulance arrival is promised.
- The What We Do 2025 paragraph includes the unrelated-looking parenthetical “Resqink Association for Wildlife Welfare.” This identity wording is not reused because its relationship to the Trust is unexplained.

## Identity, contact and certificates

- Organisation: Jan Seva Sangh Trust; founder: Suraj Kumar; established 2 October 2016; registered in 2021. These are published on About.
- Registration: `2021/JSR/24/BK4/1`; published 12A identifier: `AAETJ0040PE20231`; published 80G identifier: `AAETJ0040PF20231`.
- About and Support state CSR-1 certification but publish no certificate number. No number is invented. Current validity, accreditation, tax deduction and CSR eligibility have not been independently verified; the site directs donors to request documentation.
- Primary WhatsApp/rescue contact: `+91 7707007005`. Additional footer helpline: `+91 8877610000`. Email: `info@jansevasanghtrust.com`.
- Contact's address spelling is preserved: **Sighgora Market, Near SBI ATM, Jamshedpur, Jharkhand – 831009, India**. No street, geographic coordinates or map marker were inferred.
- Office hours: 9 AM–1 PM and 3–4 PM. Visitor hours: 10 AM–1 PM and 3–4 PM. No operating days are supplied; contact before visiting.
- Contact's HTML title says “The Stray Army,” while page body, contacts and footer identify Jan Seva Sangh Trust. That inconsistent title is not reproduced.

## Details not verified or announced

- No certificate-course announcement, eligibility, fees, dates, syllabus or accreditation was found in the reviewed pages or targeted domain searches. The existing course page is retained as an explicitly unconfirmed enquiry page. Suggested topics are not called an approved syllabus.
- No January 2025 local-volunteer report was found. The existing archive page remains explicitly pending; broad volunteer history is linked separately.
- No current career vacancies, internship terms, professional joining criteria or volunteer age limits were verified. Existing forms remain frontend demos, with direct email enquiries offered separately.
- Published species-specific work emphasises cows/dogs and mentions bird recovery and wildlife conservation. Dedicated cat services are not documented; visitors are asked to check species-specific availability. Cats, birds and rabbits are represented using retained, explicitly labelled stock photographs.
- Adoption/fostering is a listed programme, but no current adoptable-animal listings, screening policy or fees were found. Enquiry links do not imply availability.
- Rescue and success stories have no supplied event dates. No dates, medical details, additional names or invented outcomes were added. Laxmi and Moti outcomes remain attributed to the published impact page.
- The user-supplied bank details are now displayed on Donate: Jan Seva Sangh Trust; account `41459651525`; IFSC `SBIN0009009`; SBI, Baridhi (Jamshedpur); Current. A direct HTTP 200 read of Support matched the account, IFSC, bank and account type. No UPI payment QR image was present or generated; the placeholder is explicitly non-scannable. Online gateway demo behaviour and endpoints remain unchanged, and the website does not confirm bank transfers.

## Images and preserved functionality

`assets/images/trust-sources.json` maps each local Trust image to its exact source image/page. All ten gallery photos, three rescue photos, one team photo and seven award photos downloaded successfully. Two initially guessed rescue image routes were unavailable; the actual HTML supplied `image/telco-cow-rescue.jpeg` and `image/sonari-injury.jpeg`, and those corrected routes downloaded successfully. No broken guessed routes are used.

Captions describe visible content without identifying unnamed people or assigning dates from filenames. Gallery photographs are not relabelled as Laxmi/Moti or January 2025 records. Award images preserve source association. Existing logo path, heart fallback, favicon and stock assets are retained; the source site's logo has not replaced them.

The original nine HTML pages and five primary destinations are retained, with five dedicated pages added by moving existing combined sections. There are 14 pages total; every requested section has a distinct URL. Current links use those URLs, while old shared section URLs redirect appropriately. Original forms, resume validation scripts, profile data and gateway payment settings are preserved; only the donation notice was clarified to distinguish gateway checkout from bank transfers. Inspection found no backend, database or admin panel in this checkout. Career remains a browser-only resume demo with no real submission or private-file storage.

## Profiles and feature extension

About, What We Do, Awards and Contact were directly rechecked with successful HTTP 200 responses. Suraj Kumar is the only individually named founder profile confirmed in these sources. The existing group photo does not identify individuals, so no portraits were cropped/assigned to unnamed members. Ten core-member slots and three expandable doctor slots are editable through `assets/js/people-data.js`. No affiliated doctor names, qualifications or biographies were verified. Empty slots do not imply an actual staff count.

The primary WhatsApp number remains `+91 7707007005`, with a pre-filled enquiry message. Projects comprise the published rescue, treatment, rehabilitation/shelter, feeding, vaccination/sterilisation, adoption/fostering and awareness programmes. No new results, statistics or unsupported project names were added. Missing programme-specific photographs use an original local SVG illustration.

Four additional award photographs were downloaded from the exact routes on the Awards page (`award2.jpeg`, `award4.jpeg`, `award5.jpeg`, `ward6.jpeg`), completing all seven local award images. Short descriptions paraphrase the existing published recognition context; source years and presenter spelling remain unchanged. Exact file mappings are in `assets/images/trust-sources.json`.

## Dedicated-page placement

Core members are in `core-members.html`; Doctors remains `veterinary-doctors.html`, preserving its existing URL. Programme cards and published rescue stories moved to `projects.html`. Awards moved to `awards.html`. The volunteer timeline moved to `volunteer-journey.html`, and clinical/adoption/rescue information moved to `veterinary-care-adoption.html`. Original Volunteer opportunities/registration and the January archive remain available. About keeps verified history, mission, vision, animal-welfare overview, scoped impact and legal details. Home shows concise previews and direct links.

Missing member portraits, nine additional member identities/roles/stories, all doctor profiles, confirmed course/vacancy information and the official donation QR remain for the Trust to supply. QR configuration is documented in README; the placeholder is never represented as a working payment QR.
