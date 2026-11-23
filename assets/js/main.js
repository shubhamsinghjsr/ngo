'use strict';

// Use the approved Trust logo consistently in every public page header and footer.
document.querySelectorAll('.logo img').forEach((logo) => {
  logo.src = 'assets/images/logojan.jpg';
  logo.alt = 'Jan Seva Sangh Trust logo';
});

document.querySelectorAll('footer .footer-grid .brand').forEach((brand) => {
  const label = brand.textContent.replace(/^\s*♡\s*/, '').trim() || 'Jan Seva Sangh Trust';
  const logo = document.createElement('img');
  logo.className = 'footer-logo';
  logo.src = 'assets/images/logojan.jpg';
  logo.alt = 'Jan Seva Sangh Trust logo';
  brand.replaceChildren(logo, document.createTextNode(label));
});

// Keep previously shared section URLs usable after moving content to pages.
const legacySections = {
  'about.html': {
    '#projects': 'projects.html',
    '#awards': 'awards.html',
    '#journey': 'volunteer-journey.html'
  },
  'volunteer.html': {
    '#core-members': 'core-members.html',
    '#journey': 'volunteer-journey.html'
  },
  'veterinary-doctors.html': {
    '#adoption': 'veterinary-care-adoption.html#adoption',
    '#emergency': 'veterinary-care-adoption.html#emergency'
  },
  'index.html': { '#rescue-stories': 'projects.html#rescue-stories' }
};
const currentFile = location.pathname.split('/').pop() || 'index.html';
const movedSection = legacySections[currentFile]?.[location.hash];
if (movedSection) location.replace(movedSection);

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const dropdowns = [...document.querySelectorAll('.dropdown')].map(element => ({
  element,
  button: element.querySelector('.dropdown-toggle'),
  menu: element.querySelector('.dropdown-menu')
}));
function setDropdown(dropdown, open) {
  dropdown.button.setAttribute('aria-expanded', String(open));
  dropdown.menu.hidden = !open;
}
function closeDropdowns(except) {
  dropdowns.forEach(dropdown => {
    if (dropdown !== except) setDropdown(dropdown, false);
  });
}
function closeNavigation() {
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  closeDropdowns();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  if (!open) closeDropdowns();
});
dropdowns.forEach(dropdown => {
  const links = [...dropdown.menu.querySelectorAll('a')];
  dropdown.button.addEventListener('click', () => {
    const open = dropdown.menu.hidden;
    closeDropdowns(dropdown);
    setDropdown(dropdown, open);
  });
  dropdown.element.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(event.key)) return;
    if (event.key === 'Escape') {
      if (!dropdown.menu.hidden) {
        event.preventDefault(); event.stopPropagation();
        setDropdown(dropdown, false); dropdown.button.focus();
      }
      return;
    }
    event.preventDefault();
    closeDropdowns(dropdown); setDropdown(dropdown, true);
    const index = links.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1
      : event.key === 'ArrowDown' ? (index + 1) % links.length
      : index < 0 ? links.length - 1 : (index - 1 + links.length) % links.length;
    links[next]?.focus();
  });
});
document.addEventListener('click', event => {
  if (!event.target.closest('.dropdown')) closeDropdowns();
  if (!event.target.closest('header')) closeNavigation();
});
document.addEventListener('focusin', event => {
  dropdowns.forEach(dropdown => {
    if (!dropdown.element.contains(event.target)) setDropdown(dropdown, false);
  });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const openDropdown = dropdowns.find(dropdown => !dropdown.menu.hidden);
    if (openDropdown) { closeDropdowns(); openDropdown.button.focus(); }
    else if (navigation.classList.contains('open')) { closeNavigation(); menuButton.focus(); }
  }
});
window.matchMedia('(min-width: 1101px)').addEventListener('change', closeNavigation);

// The official primary rescue/contact number is also present as a static link
// in each HTML page, so WhatsApp still works without JavaScript.
document.querySelectorAll('[data-whatsapp]').forEach(link => {
  const settings = window.NGO_CONFIG?.whatsapp;
  if (!settings) return;
  if (/^[1-9]\d{7,14}$/.test(settings.number)) {
    link.href = `https://wa.me/${settings.number}?text=${encodeURIComponent(settings.message)}`;
  } else {
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.title = 'Configure the official WhatsApp number in assets/js/config.js';
  }
});

// Native constraints remain enabled. Feedback never implies a real submission.
document.querySelectorAll('.demo-form:not([data-backend])').forEach(form => {
  const status = form.querySelector('.form-status');
  form.addEventListener('invalid', () => {
    status.classList.add('error');
    status.textContent = 'Please complete required fields and check the format of your details.';
  }, true);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const meaningful = [...form.querySelectorAll('input[required]:not([type=checkbox]), textarea[required]')]
      .every(input => input.value.trim().length > 0);
    status.classList.toggle('error', !meaningful);
    status.textContent = meaningful
      ? 'Demo validation complete. Nothing was submitted or saved. For a real enquiry, email info@jansevasanghtrust.com or contact the Trust using the details on this page.'
      : 'Please enter meaningful details; spaces alone are not accepted.';
  });
});

const donationForm = document.querySelector('#donation-form');
if (donationForm) {
  const amount = donationForm.elements.amount;
  const status = donationForm.querySelector('.form-status');
  amount.min = '1'; amount.max = '10000000'; amount.step = '1';
  const choices = donationForm.querySelectorAll('[data-amount]');
  choices.forEach(button => button.addEventListener('click', () => {
    amount.value = button.dataset.amount;
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
  }));
  amount.addEventListener('input', () => choices.forEach(choice =>
    choice.setAttribute('aria-pressed', String(choice.dataset.amount === amount.value))));
  donationForm.addEventListener('invalid', () => {
    status.classList.add('error');
    status.textContent = 'Please enter a whole-rupee amount from ₹1 to ₹1,00,00,000, your name, phone, UTR and payment screenshot, and acknowledge the review notice.';
  }, true);
  if (!donationForm.dataset.backend) donationForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!donationForm.elements.name.value.trim()) {
      status.classList.add('error');
      status.textContent = 'Please enter your donor name.';
      return;
    }
    status.classList.remove('error');
    status.textContent = 'Details checked. Payment gateway is not configured. No payment was attempted, no donation was received and your details were not saved.';
  });
}

// Create one reusable modal for the gallery page and homepage preview.
let lightbox = document.querySelector('#lightbox');
if (!lightbox) {
  lightbox = document.createElement('dialog');
  lightbox.id = 'lightbox';
  lightbox.setAttribute('aria-label', 'Animal photo preview');
  lightbox.innerHTML = '<button class="close-lightbox" aria-label="Close photo preview">×</button><img alt=""><p></p>';
  document.body.append(lightbox);
}
let returnFocus;
document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
  returnFocus = button;
  const image = lightbox.querySelector('img');
  image.hidden = false;
  image.alt = button.dataset.caption;
  image.onerror = () => {
    image.hidden = true;
    lightbox.querySelector('p').textContent = `${button.dataset.caption} — Photo unavailable. Add the local image asset to see a larger preview.`;
  };
  image.src = button.dataset.image;
  lightbox.querySelector('p').textContent = button.dataset.caption;
  lightbox.showModal();
  document.body.classList.add('modal-open');
}));
lightbox.querySelector('.close-lightbox').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => {
  if (event.target === lightbox) {
    const bounds = lightbox.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) lightbox.close();
  }
});
lightbox.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  returnFocus?.focus();
});
