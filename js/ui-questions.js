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
let _yesnoRenderedFor = null;

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

  // ── Yes/No (Q13)
  const yesnoZone = document.getElementById('q-yesno-zone');
  const isYesnoQuestion = (q.type === 'yesno');

  if (isYesnoQuestion) {
    if (_yesnoRenderedFor !== q.key) {
      _renderYesno(q, yesnoZone);
      _yesnoRenderedFor = q.key;
    } else {
      _refreshYesnoSelection(q, yesnoZone);
    }
    yesnoZone.style.display = 'flex';
  } else {
    yesnoZone.style.display = 'none';
    yesnoZone.innerHTML = '';
    _yesnoRenderedFor = null;
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
  // PRÉ-COCHAGE Q8 : si on arrive sur "techniciens_presents" et que
  // l'utilisateur a déjà un rédacteur, on pré-coche cette personne
  // VISUELLEMENT (classe CSS uniquement) — sans toucher à state.responses
  // pour ne pas que updateQuestionDisplay considère Q8 comme remplie.
  // L'inscription dans state.responses se fait au clic sur Valider.
  // ────────────────────────────────────────────────────────────
  let preCheckedTechs = [];
  if (q.key === 'techniciens_presents' && !state.responses[q.key] && state.responses.redacteur) {
    preCheckedTechs = [state.responses.redacteur];
    DEBUG && console.log('✨ Pré-cochage visuel Q8 avec rédacteur:', state.responses.redacteur);
  }

  TECHNICIENS.forEach(tech => {
    const chip = document.createElement('button');
    chip.className = 'tech-chip';
    chip.textContent = tech;
    chip.dataset.tech = tech;

    // État initial selon state.responses (priorité 1) ou pré-cochage (priorité 2)
    const currentSelected = state.responses[q.key]
      ? state.responses[q.key].split(',').map(s => s.trim()).filter(Boolean)
      : preCheckedTechs;

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
  confirmBtn.onclick = () => _onChipsConfirm(q, container);
  container.appendChild(confirmBtn);
}

// Click sur un chip
function _onChipClick(q, chip, container) {
  const tech = chip.dataset.tech;

  if (q.type === 'tech-single') {
    // Single : un seul sélectionné à la fois → on écrit dans state directement
    state.responses[q.key] = tech;
    container.querySelectorAll('.tech-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    return;
  }

  // Multi : on toggle JUSTE la classe CSS, sans toucher à state.responses
  // (state.responses sera renseigné au clic sur Valider, voir _onChipsConfirm)
  chip.classList.toggle('multi-selected');
}

// Validation des chips
async function _onChipsConfirm(q, container) {
  let val;

  if (q.type === 'tech-single') {
    // Single : déjà inscrit dans state au clic du chip
    val = state.responses[q.key];
  } else {
    // Multi : on lit l'état des chips dans le DOM (incluant les pré-cochés)
    const selectedChips = container.querySelectorAll('.tech-chip.multi-selected');
    const techs = Array.from(selectedChips).map(c => c.dataset.tech);
    val = techs.join(', ');
    // On inscrit MAINTENANT (pas avant) pour que la validation parte avec la bonne valeur
    if (val) {
      state.responses[q.key] = val;
    } else {
      delete state.responses[q.key];
    }
  }

  if (!val || val.trim() === '') {
    showToast('Sélectionne au moins une personne');
    return;
  }
  // Bloquer le re-clic
  if (state.phase === 'sending') return;

  // Envoyer au serveur
  await sendButtonValue(q.key, val);
}

// Met à jour les classes des chips sans tout recréer
// (utilisé quand updateQuestionDisplay est appelé pendant le rendu)
function _refreshChipsSelection(q, container) {
  if (q.type === 'tech-single') {
    container.querySelectorAll('.tech-chip').forEach(chip => {
      chip.classList.toggle('selected', state.responses[q.key] === chip.dataset.tech);
    });
    return;
  }

  // Multi : on ne synchronise depuis state.responses QUE si state.responses[q.key]
  // existe (sinon ça écraserait les pré-cochages visuels qui ne sont pas encore
  // dans state).
  if (!state.responses[q.key]) return;

  const currentSelected = state.responses[q.key]
    .split(',').map(s => s.trim()).filter(Boolean);
  container.querySelectorAll('.tech-chip').forEach(chip => {
    chip.classList.toggle('multi-selected', currentSelected.includes(chip.dataset.tech));
  });
}

// ══════════════════════════════════════════════════════════════
// YES/NO (Q13 chantier_termine)
// ══════════════════════════════════════════════════════════════

function _renderYesno(q, container) {
  container.innerHTML = '';

  const row = document.createElement('div');
  row.className = 'yesno-row';

  ['OUI', 'NON'].forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'yesno-btn';
    btn.textContent = opt;
    btn.dataset.val = opt;

    // Pré-sélection si déjà répondu
    const current = (state.responses[q.key] || '').toUpperCase();
    if (current === opt) {
      btn.classList.add(opt === 'OUI' ? 'selected-oui' : 'selected-non');
    }

    btn.onclick = () => _onYesnoClick(q, btn, container);
    row.appendChild(btn);
  });
  container.appendChild(row);

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'confirm-yesno-btn';
  confirmBtn.textContent = 'Valider ✓';
  confirmBtn.disabled = !state.responses[q.key];
  confirmBtn.dataset.role = 'confirm';
  confirmBtn.onclick = () => _onYesnoConfirm(q);
  container.appendChild(confirmBtn);
}

function _onYesnoClick(q, btn, container) {
  const opt = btn.dataset.val;
  // Réécrit la valeur "Oui" / "Non" (capitalisé pour matcher l'agent)
  const formatted = opt === 'OUI' ? 'Oui' : 'Non';
  state.responses[q.key] = formatted;

  // Reset visuel + sélection
  container.querySelectorAll('.yesno-btn').forEach(b => {
    b.classList.remove('selected-oui', 'selected-non');
  });
  btn.classList.add(opt === 'OUI' ? 'selected-oui' : 'selected-non');

  // Activer le bouton Valider
  const confirmBtn = container.querySelector('.confirm-yesno-btn');
  if (confirmBtn) confirmBtn.disabled = false;
}

async function _onYesnoConfirm(q) {
  const val = state.responses[q.key];
  if (!val) {
    showToast('Choisis OUI ou NON');
    return;
  }
  if (state.phase === 'sending') return;
  await sendButtonValue(q.key, val);
}

function _refreshYesnoSelection(q, container) {
  const current = (state.responses[q.key] || '').toUpperCase();
  container.querySelectorAll('.yesno-btn').forEach(btn => {
    btn.classList.remove('selected-oui', 'selected-non');
    if (btn.dataset.val === current) {
      btn.classList.add(current === 'OUI' ? 'selected-oui' : 'selected-non');
    }
  });
  const confirmBtn = container.querySelector('.confirm-yesno-btn');
  if (confirmBtn) confirmBtn.disabled = !state.responses[q.key];
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
    document.getElementById('mic-zone').classList.add('started');

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
