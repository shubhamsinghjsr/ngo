'use strict';
// Only the three connected forms use this backend. Other enquiry forms retain their existing behavior.
const connectedForms = [
  [document.querySelector('#career-form'), 'career'],
  [document.querySelector('#volunteer-form'), 'volunteer'],
  [document.querySelector('#donation-form'), 'donation']
];
connectedForms.forEach(([form, kind]) => {
  if (!form) return;
  const button = form.querySelector('[type=submit]');
  const status = form.querySelector('.form-status:not(#resume-status)');
  const started = performance.now();
  if (kind === 'donation') form.elements.payment_screenshot.addEventListener('change', () => {
    const input = form.elements.payment_screenshot; const file = input.files[0];
    const allowed = file && /\.(jpe?g|png|webp)$/i.test(file.name) && ['image/jpeg','image/png','image/webp'].includes(file.type);
    input.setCustomValidity(file && (!allowed || file.size < 1 || file.size > 5 * 1024 * 1024) ? 'Select a JPG, PNG or WebP screenshot of at most 5 MB.' : '');
  });
  let busy = false;
  button.disabled = false;
  const message = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle('error', error);
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    if (performance.now() - started < 3000) { message('Please review your details before submitting.', true); return; }
    busy = true; button.disabled = true;
    message('Submitting…');
    try {
      const tokenResponse = await fetch('api/forms.php', { credentials: 'same-origin', cache: 'no-store' });
      const token = await tokenResponse.json();
      if (!tokenResponse.ok || !token.ok) throw new Error(token.message || 'Submission service is unavailable.');
      const data = new FormData(form);
      data.set('kind', kind); data.set('csrf', token.csrf);
      if (kind === 'donation' && window.NGODonationPayment?.method() === 'razorpay') {
        message('Opening secure Checkout...');
        const result = await window.NGODonationPayment.pay(data);
        message(result.message);
        if (result.reset) form.reset();
        return;
      }
      const response = await fetch('api/forms.php', { method: 'POST', body: data, credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'Submission could not be confirmed.');
      message(result.message);
      form.reset();
      const resumeStatus = document.querySelector('#resume-status');
      if (resumeStatus) resumeStatus.textContent = '';
    } catch (error) {
      message(error.message || 'Submission could not be confirmed. Contact the Trust before retrying if a network error occurred.', true);
    } finally { busy = false; button.disabled = false; }
  });
});
