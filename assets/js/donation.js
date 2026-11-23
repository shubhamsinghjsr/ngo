'use strict';

const copyAccount = document.querySelector('#copy-account');
if (copyAccount) {
  const details = document.querySelector('#bank-copy-details');
  const manualLabel = document.querySelector('#manual-copy-label');
  const status = document.querySelector('#copy-status');
  copyAccount.addEventListener('click', async () => {
    const text = details.value;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch { /* File previews may deny Clipboard API access. */ }
    if (!copied) {
      manualLabel.hidden = false;
      details.focus(); details.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; }
    }
    status.classList.toggle('error', !copied);
    status.textContent = copied ? 'Account details copied.'
      : 'Automatic copying is unavailable. Select the details below and copy them manually.';
    if (copied) { manualLabel.hidden = true; copyAccount.focus(); }
  });
}

const qrImage = document.querySelector('#donation-qr');
if (qrImage) {
  const settings = window.NGO_CONFIG?.donationQR;
  const placeholder = document.querySelector('#qr-placeholder');
  const status = document.querySelector('#qr-status');
  const localPath = settings?.image || '';
  const safePath = /^assets\/images\/[a-zA-Z0-9_/-]+\.(png|jpe?g|webp)$/i.test(localPath) && !localPath.includes('..');
  if (settings?.confirmed === true && safePath) {
    qrImage.addEventListener('load', () => {
      qrImage.hidden = false; placeholder.hidden = true;
      status.textContent = 'Scan the Trust’s official payment QR using your payment app. Contact the Trust for donation confirmation or a receipt.';
    });
    qrImage.addEventListener('error', () => {
      qrImage.hidden = true; placeholder.hidden = false;
      qrImage.removeAttribute('src');
      status.textContent = 'The approved QR image is unavailable. Contact the Trust for payment instructions.';
    }, { once: true });
    qrImage.src = localPath;
  }
}
