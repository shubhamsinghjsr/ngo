'use strict';
(async () => {
  const grid = document.querySelector('[data-admin-gallery]');
  const note = document.querySelector('#gallery-load-status');
  if (!grid) return;
  if (location.protocol === 'file:') {
    if (note) note.textContent = 'Open this website through the local PHP server to view published gallery photos.';
    return;
  }
  let failedImages = 0;
  const showImageError = () => {
    failedImages++;
    if (note) note.textContent = failedImages === 1
      ? 'One photo could not be loaded. Please refresh the page or contact the Trust.'
      : failedImages + ' photos could not be loaded. Please refresh the page or contact the Trust.';
  };
  try {
    const response = await fetch('api/gallery.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.ok || !Array.isArray(result.photos)) throw new Error('Gallery photos are unavailable.');
    grid.replaceChildren();
    result.photos.forEach(photo => {
      const source = 'api/photo.php?id=' + encodeURIComponent(photo.id);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'gallery-item';
      button.setAttribute('aria-label', 'Open larger preview: ' + photo.title);
      const wrapper = document.createElement('div'); wrapper.className = 'photo';
      const img = document.createElement('img');
      img.src = source; img.alt = photo.title; img.loading = 'lazy';
      img.addEventListener('error', () => { button.hidden = true; showImageError(); }, { once: true });
      wrapper.append(img);
      const caption = document.createElement('span'); caption.textContent = photo.title;
      button.append(wrapper, caption);
      button.addEventListener('click', () => {
        const modal = document.querySelector('#lightbox');
        const image = modal.querySelector('img');
        image.hidden = false;
        image.onerror = () => {
          image.hidden = true;
          modal.querySelector('p').textContent = 'This photo could not be loaded. Please close the preview and retry.';
        };
        image.src = source; image.alt = photo.title;
        modal.querySelector('p').textContent = photo.description ? photo.title + ' — ' + photo.description : photo.title;
        modal.showModal(); document.body.classList.add('modal-open');
        modal.addEventListener('close', () => button.focus(), { once: true });
      });
      grid.append(button);
    });
    if (note && !failedImages) note.textContent = result.photos.length
      ? 'Photographs published by Jan Seva Sangh Trust.'
      : 'No photographs have been published yet. Please check back soon.';
  } catch {
    if (note) note.textContent = 'Gallery photos could not be loaded. Please refresh the page or try again later.';
  }
})();
