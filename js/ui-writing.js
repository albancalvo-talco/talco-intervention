// ══════════════════════════════════════════════════════════════
// MODE ÉCRIT — panneau bottom-sheet avec swipe
// ══════════════════════════════════════════════════════════════

let _swipeState = {
  startX: 0, startY: 0, dx: 0, isSwiping: false
};

window.startWritingMode = async function() {
  await unlockAudio();
  document.getElementById('mic-zone').classList.add('started');
  showQuestionContent();
  state.writingMode = true;
  document.getElementById('btn-writing-mode-active')?.classList.add('writing');
  const lbl = document.getElementById('writing-mode-label');
  if (lbl) lbl.textContent = 'Mode vocal';
  openWritingPanel();
  updateQuestionDisplay();
};

window.toggleWritingMode = function() {
  state.writingMode = !state.writingMode;
  const btn = document.getElementById('btn-writing-mode-active');
  const label = document.getElementById('writing-mode-label');
  if (state.writingMode) {
    btn?.classList.add('writing');
    if (label) label.textContent = 'Mode vocal';
    openWritingPanel();
  } else {
    btn?.classList.remove('writing');
    if (label) label.textContent = 'Passer à l\'écrit';
    closeWritingPanel();
  }
  updateQuestionDisplay();
};

window.closeWritingPanel = function() {
  document.getElementById('writing-panel')?.classList.remove('open');
  if (state.writingMode) {
    state.writingMode = false;
    document.getElementById('btn-writing-mode-active')?.classList.remove('writing');
    const lbl = document.getElementById('writing-mode-label');
    if (lbl) lbl.textContent = 'Passer à l\'écrit';
    updateQuestionDisplay();
  }
};

function openWritingPanel() {
  // Démarrer sur la première question non remplie
  let firstIdx = QUESTIONS.findIndex(q => !state.responses[q.key]);
  if (firstIdx === -1) firstIdx = 0;
  state.writingIndex = firstIdx;

  buildWritingCards();
  updateWritingProgress();
  updateNavButtons();
  applyWritingTrackPosition(false);
  document.getElementById('writing-panel').classList.add('open');
  focusCurrentInput();
  initSwipe();
}

function buildWritingCards() {
  const track = document.getElementById('writing-cards-track');
  track.innerHTML = '';

  QUESTIONS.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'writing-card';
    card.dataset.index = i;

    const cat = document.createElement('div');
    cat.className = 'wc-cat';
    cat.textContent = q.cat;
    card.appendChild(cat);

    const qEl = document.createElement('div');
    qEl.className = 'wc-q';
    qEl.textContent = q.text;
    card.appendChild(qEl);

    if (q.hint) {
      const hint = document.createElement('div');
      hint.className = 'wc-hint';
      hint.textContent = q.hint;
      card.appendChild(hint);
    }

    const val = state.responses[q.key] || '';
    _appendWritingInput(card, q, val);
    track.appendChild(card);
  });
}

function _appendWritingInput(card, q, val) {
  // ── Tech single
  if (q.type === 'tech-single') {
    const wrap = document.createElement('div');
    wrap.className = 'tech-chips';
    wrap.dataset.key = q.key;
    TECHNICIENS.forEach(tech => {
      const chip = document.createElement('button');
      chip.className = 'tech-chip';
      chip.textContent = tech;
      chip.dataset.val = tech;
      if (val === tech) chip.classList.add('selected');
      chip.onclick = () => {
        state.responses[q.key] = tech;
        wrap.querySelectorAll('.tech-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        updateQuestionDisplay();
        updateWritingProgress();
        setTimeout(() => writingNav(1), 300);
      };
      wrap.appendChild(chip);
    });
    card.appendChild(wrap);
    return;
  }

  // ── Tech multi
  if (q.type === 'tech-multi') {
    const wrap = document.createElement('div');
    wrap.className = 'tech-chips';
    wrap.dataset.key = q.key;
    const selected = val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
    TECHNICIENS.forEach(tech => {
      const chip = document.createElement('button');
      chip.className = 'tech-chip';
      chip.textContent = tech;
      chip.dataset.val = tech;
      if (selected.includes(tech)) chip.classList.add('multi-selected');
      chip.onclick = () => {
        const cur = (state.responses[q.key] || '').split(',').map(s => s.trim()).filter(Boolean);
        const idx = cur.indexOf(tech);
        if (idx >= 0) { cur.splice(idx, 1); chip.classList.remove('multi-selected'); }
        else { cur.push(tech); chip.classList.add('multi-selected'); }
        state.responses[q.key] = cur.join(', ');
        if (!state.responses[q.key]) delete state.responses[q.key];
        updateQuestionDisplay();
        updateWritingProgress();
      };
      wrap.appendChild(chip);
    });
    card.appendChild(wrap);
    return;
  }

  // ── Yes / No
  if (q.type === 'yesno') {
    const row = document.createElement('div');
    row.className = 'yesno-row';
    ['OUI', 'NON'].forEach(opt => {
      const b = document.createElement('button');
      b.className = 'yesno-btn';
      b.textContent = opt;
      b.dataset.val = opt;
      if (val.toUpperCase() === opt) b.classList.add(opt === 'OUI' ? 'selected-oui' : 'selected-non');
      b.onclick = () => {
        state.responses[q.key] = opt;
        row.querySelectorAll('.yesno-btn').forEach(bb => bb.className = 'yesno-btn');
        b.classList.add(opt === 'OUI' ? 'selected-oui' : 'selected-non');
        updateQuestionDisplay();
        updateWritingProgress();
        setTimeout(() => writingNav(1), 380);
      };
      row.appendChild(b);
    });
    card.appendChild(row);
    return;
  }

  // ── Textarea
  if (q.type === 'textarea') {
    const ta = document.createElement('textarea');
    ta.className = 'wc-input wc-textarea' + (val ? ' filled' : '');
    ta.dataset.key = q.key;
    ta.value = val;
    ta.placeholder = q.hint || 'Votre réponse...';
    ta.rows = 4;
    ta.addEventListener('input', () => {
      state.responses[q.key] = ta.value.trim();
      ta.classList.toggle('filled', !!ta.value.trim());
      updateQuestionDisplay();
      updateWritingProgress();
    });
    card.appendChild(ta);
    return;
  }

  // ── Date
  if (q.type === 'date') {
    const inp = document.createElement('input');
    inp.type = 'date';
    inp.className = 'wc-input' + (val ? ' filled' : '');
    inp.dataset.key = q.key;
    if (val) {
      const parts = val.split('/');
      if (parts.length === 3) inp.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    inp.addEventListener('change', () => {
      if (inp.value) {
        const [y, m, d] = inp.value.split('-');
        state.responses[q.key] = `${d}/${m}/${y}`;
      } else {
        delete state.responses[q.key];
      }
      inp.classList.toggle('filled', !!inp.value);
      updateQuestionDisplay();
      updateWritingProgress();
    });
    card.appendChild(inp);
    return;
  }

  // ── Time
  if (q.type === 'time') {
    const inp = document.createElement('input');
    inp.type = 'time';
    inp.className = 'wc-input' + (val ? ' filled' : '');
    inp.dataset.key = q.key;
    if (val) inp.value = val.replace('h', ':').substring(0, 5);
    inp.addEventListener('change', () => {
      if (inp.value) state.responses[q.key] = inp.value;
      else delete state.responses[q.key];
      inp.classList.toggle('filled', !!inp.value);
      updateQuestionDisplay();
      updateWritingProgress();
    });
    card.appendChild(inp);
    return;
  }

  // ── Number
  if (q.type === 'number') {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.pattern = '[0-9\\-]*';
    inp.className = 'wc-input' + (val ? ' filled' : '');
    inp.dataset.key = q.key;
    inp.value = val;
    inp.placeholder = q.hint || '';
    inp.autocomplete = 'off';
    inp.addEventListener('input', () => {
      state.responses[q.key] = inp.value.trim();
      inp.classList.toggle('filled', !!inp.value.trim());
      updateQuestionDisplay();
      updateWritingProgress();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); writingNav(1); }
    });
    card.appendChild(inp);
    return;
  }

  // ── Text (default)
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'wc-input' + (val ? ' filled' : '');
  inp.dataset.key = q.key;
  inp.value = val;
  inp.placeholder = q.hint || 'Votre réponse...';
  inp.autocomplete = 'off';
  inp.addEventListener('input', () => {
    state.responses[q.key] = inp.value.trim();
    inp.classList.toggle('filled', !!inp.value.trim());
    updateQuestionDisplay();
    updateWritingProgress();
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); writingNav(1); }
  });
  card.appendChild(inp);
}

function syncWritingPanelValues() {
  document.querySelectorAll('.writing-card').forEach((card, i) => {
    const q = QUESTIONS[i];
    if (!q) return;
    const val = state.responses[q.key] || '';

    if (q.type === 'tech-single') {
      card.querySelectorAll('.tech-chip').forEach(c => c.classList.toggle('selected', c.dataset.val === val));
      return;
    }
    if (q.type === 'tech-multi') {
      const sel = val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
      card.querySelectorAll('.tech-chip').forEach(c => c.classList.toggle('multi-selected', sel.includes(c.dataset.val)));
      return;
    }
    if (q.type === 'yesno') {
      card.querySelectorAll('.yesno-btn').forEach(b => {
        b.className = 'yesno-btn';
        if (val.toUpperCase() === b.dataset.val) b.classList.add(b.dataset.val === 'OUI' ? 'selected-oui' : 'selected-non');
      });
      return;
    }

    const inp = card.querySelector('.wc-input');
    if (!inp) return;
    if (q.type === 'date') {
      if (val) {
        const parts = val.split('/');
        if (parts.length === 3) inp.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    } else if (q.type === 'time') {
      inp.value = val ? val.replace('h', ':').substring(0, 5) : '';
    } else {
      inp.value = val;
    }
    inp.classList.toggle('filled', !!val);
  });
}

function updateWritingProgress() {
  const container = document.getElementById('writing-progress');
  if (!container) return;
  container.innerHTML = '';
  const displayed = Math.min(QUESTIONS.length, 20);
  const step = QUESTIONS.length / displayed;
  for (let i = 0; i < displayed; i++) {
    const idx = Math.floor(i * step);
    const isActive = Math.floor(state.writingIndex / step) === i;
    const isDone = !!state.responses[QUESTIONS[idx]?.key];
    const dot = document.createElement('div');
    dot.className = 'wp-dot' + (isActive ? ' active' : isDone ? ' done' : '');
    container.appendChild(dot);
  }
}

window.goToWritingQuestion = function(idx) {
  state.writingIndex = Math.max(0, Math.min(QUESTIONS.length - 1, idx));
  applyWritingTrackPosition(true);
  updateWritingProgress();
  updateNavButtons();
  updateQuestionDisplay();
  focusCurrentInput();
};

window.writingNav = function(dir) { goToWritingQuestion(state.writingIndex + dir); };

window.writingSkip = function() {
  delete state.responses[QUESTIONS[state.writingIndex]?.key];
  updateQuestionDisplay();
  updateWritingProgress();
  writingNav(1);
};

function applyWritingTrackPosition(animated = true) {
  const track = document.getElementById('writing-cards-track');
  if (!track) return;
  track.style.transition = animated ? 'transform .32s cubic-bezier(.4,0,.2,1)' : 'none';
  track.style.transform = `translateX(-${state.writingIndex * 100}%)`;
  if (!animated) track.offsetWidth;
}

function focusCurrentInput() {
  setTimeout(() => {
    const card = document.querySelectorAll('.writing-card')[state.writingIndex];
    if (!card) return;
    const inp = card.querySelector('input[type="text"],textarea');
    if (inp) inp.focus();
  }, 350);
}

function updateNavButtons() {
  const prev = document.getElementById('wn-prev');
  const next = document.getElementById('wn-next');
  if (!prev || !next) return;
  prev.style.opacity = state.writingIndex === 0 ? '.35' : '1';
  prev.disabled = state.writingIndex === 0;
  const isLast = state.writingIndex === QUESTIONS.length - 1;
  next.className = 'wn-btn wn-next' + (isLast ? ' last' : '');
  next.textContent = isLast ? 'Terminer ✓' : 'Suiv. →';
  next.onclick = isLast ? () => showPreview() : () => writingNav(1);
}

function initSwipe() {
  const wrap = document.getElementById('writing-cards-wrap');
  if (!wrap) return;
  wrap.removeEventListener('touchstart', _onTouchStart);
  wrap.removeEventListener('touchmove', _onTouchMove);
  wrap.removeEventListener('touchend', _onTouchEnd);
  wrap.addEventListener('touchstart', _onTouchStart, { passive: true });
  wrap.addEventListener('touchmove', _onTouchMove, { passive: false });
  wrap.addEventListener('touchend', _onTouchEnd, { passive: true });
}

function _onTouchStart(e) {
  _swipeState.startX = e.touches[0].clientX;
  _swipeState.startY = e.touches[0].clientY;
  _swipeState.dx = 0;
  _swipeState.isSwiping = false;
}

function _onTouchMove(e) {
  const dx = e.touches[0].clientX - _swipeState.startX;
  const dy = e.touches[0].clientY - _swipeState.startY;
  if (!_swipeState.isSwiping && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
  if (!_swipeState.isSwiping) {
    _swipeState.isSwiping = Math.abs(dx) > Math.abs(dy);
    if (!_swipeState.isSwiping) return;
  }
  e.preventDefault();
  _swipeState.dx = dx;
  const track = document.getElementById('writing-cards-track');
  track.style.transition = 'none';
  track.style.transform = `translateX(calc(-${state.writingIndex * 100}% + ${dx}px))`;
}

function _onTouchEnd() {
  if (!_swipeState.isSwiping) return;
  const threshold = window.innerWidth * 0.22;
  if (_swipeState.dx < -threshold && state.writingIndex < QUESTIONS.length - 1) writingNav(1);
  else if (_swipeState.dx > threshold && state.writingIndex > 0) writingNav(-1);
  else applyWritingTrackPosition(true);
  _swipeState.isSwiping = false;
  _swipeState.dx = 0;
}
