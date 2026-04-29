// ══════════════════════════════════════════════════════════════
// UI — Question courante + chips techniciens
// ══════════════════════════════════════════════════════════════
//
// Fix du bug Q7/Q8 :
// - On NE recrée PAS les chips si elles sont déjà rendues pour
//   la même question (évite les race conditions de sélection)
// - Un seul bouton "Valider" pour single ET multi
// - L'audio de la question est joué APRÈS la réponse précédente
//   (logique dans api.js, pas ici)
// ══════════════════════════════════════════════════════════════

// Mémo pour savoir si les chips sont déjà rendus pour la question courante
let _chipsRenderedFor = null;

function updateQuestionDisplay() {
  // Priorité 1 : si state.currentQuestionIndex est défini ET correspond à une
  // question non encore remplie, on l'utilise.
  // Priorité 2 : sinon on prend la 1ère question non remplie.
  let currentIdx = state.currentQuestionIndex;
  const currentKey = QUESTIONS[currentIdx]?.key;
  const currentFilled = currentKey && state.responses[currentKey];

  if (currentFilled || currentIdx == null || currentIdx < 0) {
    // L'index actuel pointe sur une question déjà remplie → on cherche la suivante
    currentIdx = QUESTIONS.findIndex(q => !state.responses[q.key]);
    if (currentIdx === -1) currentIdx = QUESTIONS.length - 1;
  }
  state.currentQuestionIndex = currentIdx;

  const q = QUESTIONS[currentIdx];
  const filledCount = QUESTIONS.filter(qq => state.responses[qq.key]).length;

  // ── Barre de progression
  const bar = document.getElementById('progress-bar');
  bar.innerHTML = '';
  QUESTIONS.forEach((qq, i) => {
    const dot = document.createElement('div');
    dot.className = 'progress-dot';
    if (state.responses[qq.key]) dot.classList.add('done');
    else if (i === currentIdx) dot.classList.add('active');
    else dot.classList.add('pending');
    dot.onclick = () => {
      if (state.writingMode) goToWritingQuestion(i);
    };
    bar.appendChild(dot);
  });

  // ── Question
  document.getElementById('q-category').textContent = q.cat;
  document.getElementById('q-text').textContent = q.text;
  document.getElementById('q-hint').textContent = q.hint || '';

  // ── Chips (Q7/Q8) ou pas
  // On affiche TOUJOURS les chips pour les questions tech-* (même si déjà rempli),
  // pour permettre à l'utilisateur de modifier sa sélection.
  const chipsZone = document.getElementById('q-chips-zone');
  const isChipsQuestion = (q.type === 'tech-single' || q.type === 'tech-multi');

  if (isChipsQuestion) {
    if (_chipsRenderedFor !== q.key) {
      _renderChips(q, chipsZone);
      _chipsRenderedFor = q.key;
    } else {
      _refreshChipsSelection(q, chipsZone);
    }
    chipsZone.style.display = 'flex';
  } else {
    chipsZone.style.display = 'none';
    chipsZone.innerHTML = '';
    _chipsRenderedFor = null;
  }

  // ── Réponse (badge vert si remplie, badge orange si en attente)
  const answerEl = document.getElementById('q-answer');
  if (state.responses[q.key]) {
    answerEl.textContent = state.responses[q.key];
    answerEl.className = 'q-answer';
    answerEl.style.display = 'flex';
  } else if (state.phase === 'sending' || state.phase === 'recording') {
    answerEl.textContent = 'En attente de ta réponse...';
    answerEl.className = 'q-answer pending';
    answerEl.style.display = 'flex';
  } else {
    answerEl.style.display = 'none';
  }

  // ── Compteur
  document.getElementById('progress-counter').innerHTML =
    `Question <span>${currentIdx + 1}</span> / ${QUESTIONS.length} · ${filledCount} rempli${filledCount > 1 ? 's' : ''}`;

  // ── Animation fade-in
  const card = document.getElementById('current-question');
  card.style.animation = 'none';
  card.offsetHeight; // reflow
  card.style.animation = 'questionFadeIn .4s ease-out';
}

// Rendu initial des chips (single ou multi)
function _renderChips(q, container) {
  container.innerHTML = '';

  // ────────────────────────────────────────────────────────────
  // PRÉ-COCHAGE Q8 : si on est sur "techniciens_presents" et que
  // l'utilisateur a déjà un rédacteur (auto-rempli via Google),
  // on pré-coche automatiquement cette personne.
  // ────────────────────────────────────────────────────────────
  if (q.key === 'techniciens_presents' && !state.responses[q.key] && state.responses.redacteur) {
    state.responses[q.key] = state.responses.redacteur;
    console.log('✨ Pré-cochage Q8 avec rédacteur:', state.responses.redacteur);
  }

  TECHNICIENS.forEach(tech => {
    const chip = document.createElement('button');
    chip.className = 'tech-chip';
    chip.textContent = tech;
    chip.dataset.tech = tech;

    // État initial selon state.responses
    const currentSelected = state.responses[q.key]
      ? state.responses[q.key].split(',').map(s => s.trim()).filter(Boolean)
      : [];

    if (q.type === 'tech-single' && state.responses[q.key] === tech) {
      chip.classList.add('selected');
    }
    if (q.type === 'tech-multi' && currentSelected.includes(tech)) {
      chip.classList.add('multi-selected');
    }

    chip.onclick = () => _onChipClick(q, chip, container);
    container.appendChild(chip);
  });

  // Bouton Valider (commun aux deux types)
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'confirm-multi-btn';
  confirmBtn.textContent = 'Valider ✓';
  confirmBtn.dataset.role = 'confirm';
  confirmBtn.onclick = () => _onChipsConfirm(q);
  container.appendChild(confirmBtn);
}

// Click sur un chip
function _onChipClick(q, chip, container) {
  const tech = chip.dataset.tech;

  if (q.type === 'tech-single') {
    // Single : un seul sélectionné à la fois
    state.responses[q.key] = tech;
    container.querySelectorAll('.tech-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    return;
  }

  // Multi : toggle
  const currentSelected = state.responses[q.key]
    ? state.responses[q.key].split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const idx = currentSelected.indexOf(tech);
  if (idx >= 0) {
    currentSelected.splice(idx, 1);
    chip.classList.remove('multi-selected');
  } else {
    currentSelected.push(tech);
    chip.classList.add('multi-selected');
  }

  if (currentSelected.length > 0) {
    state.responses[q.key] = currentSelected.join(', ');
  } else {
    delete state.responses[q.key];
  }
}

// Validation des chips
async function _onChipsConfirm(q) {
  const val = state.responses[q.key];
  if (!val || val.trim() === '') {
    showToast('Sélectionne au moins une personne');
    return;
  }
  // Bloquer le re-clic
  if (state.phase === 'sending') return;

  // Envoyer au serveur
  await sendToAgent(null, val);
}

// Met à jour les classes des chips sans tout recréer
// (utilisé quand updateQuestionDisplay est appelé pendant le rendu)
function _refreshChipsSelection(q, container) {
  const currentSelected = state.responses[q.key]
    ? state.responses[q.key].split(',').map(s => s.trim()).filter(Boolean)
    : [];

  container.querySelectorAll('.tech-chip').forEach(chip => {
    const tech = chip.dataset.tech;
    if (q.type === 'tech-single') {
      chip.classList.toggle('selected', state.responses[q.key] === tech);
    } else {
      chip.classList.toggle('multi-selected', currentSelected.includes(tech));
    }
  });
}

// ══════════════════════════════════════════════════════════════
// AFFICHAGE DU CONTENU PRINCIPAL (après "Commencer")
// ══════════════════════════════════════════════════════════════

function showQuestionContent() {
  document.getElementById('question-content').style.display = 'block';
  updateQuestionDisplay();
}

// Bouton "Commencer" affiché après l'init
function showStartButton() {
  const zone = document.getElementById('start-button-zone');
  zone.style.display = 'block';

  // Vider et reconstruire (idempotent)
  zone.innerHTML = '';

  const container = document.createElement('div');
  container.style.cssText = `
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:24px;padding:60px 24px;min-height:60vh;
  `;

  const text = document.createElement('p');
  text.style.cssText = 'font-size:16px;color:var(--text2);text-align:center;max-width:300px;';

  // Si redacteur déjà auto-rempli → message personnalisé
  if (state.responses.redacteur) {
    text.innerHTML = `Bonjour <strong style="color:var(--gold)">${escHtml(state.responses.redacteur.split(' ')[0])}</strong> 👋<br>Prêt à commencer le rapport ?`;
  } else {
    text.textContent = 'Prêt à commencer les questions ?';
  }

  const startBtn = document.createElement('button');
  startBtn.className = 'btn-start';
  startBtn.style.cssText = 'padding:16px 40px;font-size:16px;font-weight:700;';
  startBtn.textContent = 'Commencer';
  startBtn.onclick = async () => {
    document.getElementById('start-button-zone').style.display = 'none';
    document.getElementById('question-content').style.display = 'block';

    // Démarrer sur la première question non remplie
    // (peut être 'techniciens_presents' si redacteur auto-rempli)
    let firstIdx = QUESTIONS.findIndex(q => !state.responses[q.key]);
    if (firstIdx === -1) firstIdx = 0;
    state.currentQuestionIndex = firstIdx;

    updateQuestionDisplay();
    await playLocalAudio(QUESTIONS[firstIdx].key).catch(() => {});
  };

  container.appendChild(text);
  container.appendChild(startBtn);
  zone.appendChild(container);
}
