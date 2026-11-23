'use strict';

const careerForm = document.querySelector('#career-form');
if (careerForm) {
  const resume = careerForm.elements.resume;
  const resumeStatus = document.querySelector('#resume-status');
  const status = careerForm.querySelector('.form-status:not(#resume-status)');
  const submit = careerForm.querySelector('[type=submit]');
  const settings = window.NGO_CONFIG?.career;
  const maximum = settings?.maxResumeBytes || 5 * 1024 * 1024;
  const started = performance.now();
  let lastValidation = -Infinity;
  let selectionRevision = 0;
  let busy = false;
  submit.disabled = false;

  function feedback(message, error) {
    status.textContent = message;
    status.classList.toggle('error', error);
  }
  resume.addEventListener('change', async () => {
    const revision = ++selectionRevision;
    resume.setCustomValidity('');
    resumeStatus.textContent = 'Checking resume…';
    resumeStatus.classList.remove('error');
    const result = await window.ResumeValidation.check(resume.files[0], maximum);
    if (revision !== selectionRevision) return;
    resume.setCustomValidity(result.valid ? '' : result.message);
    resumeStatus.classList.toggle('error', !result.valid);
    resumeStatus.textContent = result.message;
  });

  careerForm.addEventListener('invalid', () => {
    feedback('Please complete required fields, enter valid contact details and select a supported resume.', true);
  }, true);

  if (!careerForm.dataset.backend) careerForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (careerForm.elements.website.value.trim()) {
      feedback('Unable to validate this application. Refresh the page and try again.', true);
      return;
    }
    if (performance.now() - started < (settings?.minFillMilliseconds ?? 3000)) {
      feedback('Please take a moment to review your details before validating.', true);
      return;
    }
    if (performance.now() - lastValidation < (settings?.retryDelayMilliseconds ?? 15000)) {
      feedback('Your demo application was already checked. Please wait a few seconds before trying again.', true);
      return;
    }
    if (!careerForm.checkValidity()) { careerForm.reportValidity(); return; }
    const meaningful = careerForm.elements.name.value.trim().length >= 2
      && careerForm.elements.role.value.trim().length >= 2
      && careerForm.elements.message.value.trim().length >= 10
      && careerForm.elements.name.value.length <= 100
      && careerForm.elements.role.value.length <= 100
      && careerForm.elements.message.value.length <= 2000
      && careerForm.elements.email.value.length <= 254;
    if (!meaningful) {
      feedback('Enter a name and position with at least 2 characters, and a message with at least 10 meaningful characters.', true);
      return;
    }
    const selected = resume.files[0];
    busy = true; submit.disabled = true;
    try {
      const result = await window.ResumeValidation.check(selected, maximum);
      if (resume.files[0] !== selected) {
        feedback('Your resume selection changed. Please review the selected file and validate again.', true);
        return;
      }
      if (!result.valid) {
        resume.setCustomValidity(result.message);
        resumeStatus.textContent = result.message;
        resumeStatus.classList.add('error');
        feedback(result.message, true);
        return;
      }
      lastValidation = performance.now();
      feedback('Demo validation complete. Your details and resume were not uploaded, submitted or saved. Contact info@jansevasanghtrust.com for a real career enquiry.', false);
    } finally {
      busy = false; submit.disabled = false;
    }
  });
}
