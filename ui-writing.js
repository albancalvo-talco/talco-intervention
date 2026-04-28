// ══════════════════════════════════════════════════════════════
// MODAL PREVIEW + PHOTOS + CONFIRMATION
// ══════════════════════════════════════════════════════════════

// ── Compression d'image avant upload (max 1200px, JPEG 82%)
async function compressImage(file) {
  return new Promise(resolve => {
    const MAX = 1200, QUALITY = 0.82;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if (w <= MAX && h <= MAX) { resolve(file); return; }
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else { w = Math.round(w * MAX / h); h = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
          type: 'image/jpeg',
          lastModified: Date.now()
        }));
      }, 'image/jpeg', QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

window.handlePhotoInput = async function(input) {
  const files = Array.from(input.files).slice(0, 5 - state.photoFiles.length);
  input.value = '';
  if (!files.length) return;
  showToast('Compression…');
  for (const file of files) {
    if (state.photoFiles.length >= 5) break;
    const c = await compressImage(file);
    state.photoFiles.push(c);
    state.photoUrls.push(URL.createObjectURL(c));
  }
  rebuildPhotoGrid();
  const ko = Math.round(state.photoFiles.reduce((s, f) => s + f.size, 0) / 1024);
  showToast(`${state.photoFiles.length} photo${state.photoFiles.length > 1 ? 's' : ''} · ${ko} ko`);
};

function rebuildPhotoGrid() {
  const grid = document.getElementById('photos-grid');
  if (!grid) return;
  grid.innerHTML = '';

  state.photoUrls.forEach((url, i) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    div.innerHTML = `<img src="${url}"><button class="rm-ph" onclick="removePhoto(${i})">✕</button>`;
    grid.appendChild(div);
  });

  if (state.photoFiles.length < 5) {
    const add = document.createElement('label');
    add.className = 'photo-add-label';
    add.setAttribute('for', 'file-input');
    add.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg><span>Photo</span>`;
    grid.appendChild(add);
  }

  const c = document.getElementById('photo-counter');
  if (c) c.textContent = `${state.photoFiles.length} / 5`;
}

window.removePhoto = function(i) {
  URL.revokeObjectURL(state.photoUrls[i]);
  state.photoFiles.splice(i, 1);
  state.photoUrls.splice(i, 1);
  rebuildPhotoGrid();
};

// ══════════════════════════════════════════════════════════════
// MODAL PREVIEW
// ══════════════════════════════════════════════════════════════

window.showPreview = function() {
  document.getElementById('writing-panel')?.classList.remove('open');

  const body = document.getElementById('preview-body');
  body.innerHTML = '';

  QUESTIONS.forEach(q => {
    const val = state.responses[q.key] || '';
    const div = document.createElement('div');
    div.className = 'preview-field';
    div.innerHTML = `<div class="pf-label">${q.label}</div>
      <input class="pf-value" data-key="${q.key}" value="${escHtml(val)}" placeholder="Non renseigné">`;
    body.appendChild(div);
  });

  const photoDiv = document.createElement('div');
  photoDiv.className = 'preview-photos';
  photoDiv.innerHTML = `<div class="pf-label">Photos chantier <span id="photo-counter">${state.photoFiles.length} / 5</span></div>
    <div class="photos-grid" id="photos-grid"></div>`;
  body.appendChild(photoDiv);

  rebuildPhotoGrid();
  document.getElementById('modal-preview').classList.add('visible');
};

window.closePreview = function() {
  // Sauver les éventuelles modifs
  document.querySelectorAll('#preview-body .pf-value').forEach(inp => {
    const key = inp.dataset.key;
    const val = inp.value.trim();
    if (val) state.responses[key] = val;
    else delete state.responses[key];
  });
  updateQuestionDisplay();
  document.getElementById('modal-preview').classList.remove('visible');
};

// ══════════════════════════════════════════════════════════════
// CONFIRMATION
// ══════════════════════════════════════════════════════════════

window.showConfirmation = function() {
  const r = state.responses;
  document.getElementById('confirm-recap').innerHTML =
    `<strong>👷 ${escHtml(state.user?.name || '')}</strong><br>` +
    `Client: <strong>${escHtml(r.nom_client || '—')}</strong><br>` +
    `Affaire: <strong>${escHtml(r.numero_affaire || '—')}</strong><br>` +
    `Type: <strong>${escHtml(r.type_intervention || '—')}</strong><br>` +
    `Terminé: <strong>${escHtml(r.chantier_termine || '—')}</strong><br>` +
    `Photos: <strong>${state.photoFiles.length}</strong>`;
  showScreen('confirmation');
};

window.nouveauRapport = function() {
  startSession();
};
