'use strict';

// DOM text nodes keep editable profile text from becoming executable markup.
function profileText(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function localProfilePhoto(value) {
  if (typeof value !== 'string') return '';
  // Only local image assets. Do not load remote URLs or traversal paths.
  return /^assets\/(?:images|member)\/[a-zA-Z0-9_/%() -]+\.(?:png|jpe?g|webp)$/i.test(value) && !value.includes('..') ? value : '';
}

function renderProfiles(container, entries, doctor) {
  if (!container || !Array.isArray(entries)) return;
  const cards = entries.map((person, index) => {
    const article = document.createElement('article');
    article.className = 'profile-card panel';
    const name = String(person.name || '').trim();
    const portrait = document.createElement('div');
    portrait.className = 'profile-portrait';
    const placeholder = document.createElement('img');
    placeholder.src = 'assets/images/profile-placeholder.svg';
    placeholder.alt = name ? `Portrait pending for ${name}` : 'Profile photograph awaiting approved details';
    portrait.append(placeholder);
    const photo = localProfilePhoto(person.photo);
    if (photo) {
      const image = document.createElement('img');
      image.alt = `Portrait of ${name || (doctor ? 'a doctor' : 'a core member')}`;
      image.loading = 'lazy';
      image.addEventListener('load', () => { placeholder.hidden = true; });
      image.addEventListener('error', () => { image.remove(); placeholder.hidden = false; });
      image.src = photo;
      portrait.append(image);
    }
    article.append(portrait);
    article.append(profileText('small', `${doctor ? 'DOCTOR' : 'CORE MEMBER'} • ${String(index + 1).padStart(2, '0')}`, 'card-number'));
    article.append(profileText('h3', name || (doctor ? 'Doctor name to be added' : 'Member name to be added')));
    if (doctor) {
      article.append(profileText('p', person.qualification || 'Qualification to be confirmed', 'profile-detail'));
      article.append(profileText('p', person.specialization || 'Specialization to be confirmed', 'profile-detail'));
    }
    article.append(profileText('p', person.role || 'Role / designation to be confirmed', 'profile-role'));
    article.append(profileText('p', person.story || 'Add an approved short introduction or story here.', 'profile-story'));
    if (!name) article.append(profileText('small', 'Profile details awaiting confirmation', 'profile-pending'));
    if (person.source && /^https:\/\/(?:www\.)?jansevasanghtrust\.com\//.test(person.source)) {
      const citation = profileText('a', 'Published profile background ↗', 'source-link');
      citation.href = person.source;
      article.append(citation);
    }
    return article;
  });
  container.replaceChildren(...cards);
}

renderProfiles(document.querySelector('#core-member-grid'), window.NGO_PEOPLE?.coreMembers, false);
renderProfiles(document.querySelector('#doctor-grid'), window.NGO_PEOPLE?.doctors, true);

// Reuse the approved founder portrait from the same editable profile data.
// Until it is supplied (or if it cannot load), the local placeholder remains.
const founderPortrait = document.querySelector('[data-founder-portrait]');
if (founderPortrait) {
  const founder = window.NGO_PEOPLE?.coreMembers?.find(person => person.id === 'member-01');
  const portraitPath = localProfilePhoto(founder?.photo);
  if (portraitPath) {
    const approvedPortrait = new Image();
    approvedPortrait.addEventListener('load', () => {
      founderPortrait.src = portraitPath;
      founderPortrait.alt = 'Portrait of Suraj Kumar, founder of Jan Seva Sangh Trust';
      document.querySelector('[data-founder-photo-note]').hidden = true;
    });
    approvedPortrait.addEventListener('error', () => {
      document.querySelector('[data-founder-photo-note]').textContent = 'Approved founder photo is unavailable';
    });
    approvedPortrait.src = portraitPath;
  }
}
