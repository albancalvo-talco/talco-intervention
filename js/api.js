// ══════════════════════════════════════════════════════════════
// API — Communication avec le backend n8n
// ══════════════════════════════════════════════════════════════
//
// 3 fonctions :
// - sendToAgent       : audio ou texte libre → passe par l'agent OpenAI
// - sendButtonValue   : valeur d'un bouton (chip / yes/no) → bypass agent
// - submitReport      : envoi final du rapport (avec photos)
//
// Garde anti-double-envoi via state.phase + lastSendTime.
// Aucun audio joué pendant la phase __init__ (isInitPhase=true).
// ══════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
// HELPER — fetch JSON avec retry exponentiel
//
// Chaque tentative recrée son propre AbortController (timeout indépendant).
// Retente sur : erreur réseau (TypeError) + 5xx serveur.
// Ne retente PAS sur : AbortError (timeout voulu) ni 4xx.
// Backoff : 1s, 2s entre les tentatives (maxRetries = 2 par défaut).
// ──────────────────────────────────────────────────────────────
async function _fetchJSONWithRetry(payload, maxRetries = 2, onRetry) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      if (onRetry) onRetry(attempt, maxRetries);
      await new Promise(r => setTimeout(r, delay));
      showTimeoutBar(CONFIG.TIMEOUT_MS);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT_MS);
    try {
      const resp = await fetch(CONFIG.VOICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (resp.status >= 500 && attempt < maxRetries) {
        lastErr = new Error('HTTP ' + resp.status);
        continue;
      }
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return await resp.json();
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw e;
      lastErr = e;
      if (attempt === maxRetries) throw lastErr;
    }
  }
  throw lastErr;
}

async function sendToAgent(audioBase64, textInput) {
  if (state.phase === 'sending') {
    DEBUG && console.warn('⚠️ sendToAgent déjà en cours');
    return;
  }

  const now = Date.now();
  if (state.lastSendTime && (now - state.lastSendTime) < 800) {
    DEBUG && console.warn('⚠️ Appel trop rapide, ignoré');
    return;
  }
  state.lastSendTime = now;

  setPhase('sending');
  document.getElementById('walkie-btn')?.classList.add('processing');
  updateMicStatus('Envoi...');
  showTimeoutBar(CONFIG.TIMEOUT_MS);

  const fieldBeforeSend = QUESTIONS[state.currentQuestionIndex]?.key;

  let data = null;

  try {
    const payload = {
      session_id:   state.session_id,
      sender_email: state.user?.email || '',
      sender_name:  state.user?.name || '',
      history:      state.history,
      responses:    state.responses
    };
    if (audioBase64) payload.audio_base64 = audioBase64;
    if (textInput === '__init__') payload.text_input = '__init__';
    else if (textInput) payload.text_input = textInput;

    data = await _fetchJSONWithRetry(payload, 2, (attempt, max) => {
      updateMicStatus(`Réseau instable — tentative ${attempt}/${max}…`);
    });

    hideTimeoutBar();

    state.history = data.history || state.history;
    state.responses = { ...state.responses, ...(data.responses || {}) };
    state.is_complete = data.is_complete || false;

    if (state.writingMode) syncWritingPanelValues();

  } catch (e) {
    hideTimeoutBar();
    const msg = e.name === 'AbortError' ? 'Timeout — serveur trop lent' : 'Réseau indisponible';
    showToast('Erreur : ' + msg);
    updateMicStatus('Erreur — réessaie');
    setPhase('idle');
    return;
  }

  document.getElementById('walkie-btn')?.classList.remove('processing', 'listening');

  // Phase init : pas d'audio, pas d'affichage
  if (textInput === '__init__' || state.isInitPhase) {
    setPhase('idle');
    return;
  }

  setPhase('idle');

  // Rapport complet
  if (state.is_complete) {
    updateMicStatus('Rapport complet ✓');
    await playLocalAudio('complet').catch(() => {});
    showPreview();
    return;
  }

  // Avancer vers la prochaine question
  if (data && data.next_field) {
    let nextField = data.next_field;

    // Garde anti-boucle (audio uniquement) : si même champ et pas stocké,
    // l'agent n'a pas pu extraire → on alerte au lieu de rejouer
    const responseStored = !!state.responses[fieldBeforeSend];
    if (nextField === fieldBeforeSend && !responseStored && audioBase64) {
      console.warn('🔁 Boucle détectée sur:', fieldBeforeSend);
      showToast('Je n\'ai pas bien compris, réessaie en parlant plus clairement');
      updateMicStatus('Réessaie — parle distinctement');
      return;
    }

    // Auto-skip redacteur si déjà rempli via Google
    if (nextField === 'redacteur' && state.responses.redacteur) {
      DEBUG && console.log('⏭️ Auto-skip redacteur (déjà rempli via Google)');
      nextField = 'techniciens_presents';
    }

    const nextIdx = QUESTIONS.findIndex(q => q.key === nextField);
    if (nextIdx !== -1) state.currentQuestionIndex = nextIdx;

    updateQuestionDisplay();
    await playLocalAudio(nextField).catch(() => {});
    updateMicStatus('Maintiens pour parler');
  }
}

// ══════════════════════════════════════════════════════════════
// SYNC DIRECT — bypass agent OpenAI pour les boutons
// ══════════════════════════════════════════════════════════════
//
// Utilisé quand l'utilisateur clique un bouton (chip ou yes/no).
// La valeur est connue, pas d'ambiguïté → on bypass l'agent
// OpenAI et on demande juste un recalcul de next_field au serveur.
//
// Côté n8n : nécessite la branche `IF — Action sync ?` qui route
// vers `Code — Sync direct`.
// ══════════════════════════════════════════════════════════════

async function sendButtonValue(fieldKey, value) {
  if (state.phase === 'sending') {
    DEBUG && console.warn('⚠️ sendButtonValue déjà en cours');
    return;
  }

  state.lastSendTime = Date.now();
  setPhase('sending');
  document.getElementById('walkie-btn')?.classList.add('processing');
  updateMicStatus('Envoi...');
  showTimeoutBar(CONFIG.TIMEOUT_MS);

  // Inscrire la valeur dans state.responses (au cas où le caller ne l'a pas fait)
  state.responses[fieldKey] = value;

  let data = null;

  try {
    const payload = {
      session_id:   state.session_id,
      sender_email: state.user?.email || '',
      sender_name:  state.user?.name || '',
      history:      state.history,
      responses:    state.responses,
      action:       'sync',
      text_input:   value
    };

    data = await _fetchJSONWithRetry(payload, 2, (attempt, max) => {
      updateMicStatus(`Réseau instable — tentative ${attempt}/${max}…`);
    });

    hideTimeoutBar();

    state.history = data.history || state.history;
    state.responses = { ...state.responses, ...(data.responses || {}) };
    state.is_complete = data.is_complete || false;

    if (state.writingMode) syncWritingPanelValues();

  } catch (e) {
    hideTimeoutBar();
    const msg = e.name === 'AbortError' ? 'Timeout — serveur trop lent' : 'Réseau indisponible';
    showToast('Erreur : ' + msg);
    updateMicStatus('Erreur — réessaie');
    setPhase('idle');
    return;
  }

  document.getElementById('walkie-btn')?.classList.remove('processing', 'listening');
  setPhase('idle');

  // Rapport complet
  if (state.is_complete) {
    updateMicStatus('Rapport complet ✓');
    await playLocalAudio('complet').catch(() => {});
    showPreview();
    return;
  }

  // Avancer vers la prochaine question
  if (data && data.next_field) {
    let nextField = data.next_field;

    // Auto-skip redacteur si déjà rempli via Google
    if (nextField === 'redacteur' && state.responses.redacteur) {
      DEBUG && console.log('⏭️ Auto-skip redacteur (déjà rempli via Google)');
      nextField = 'techniciens_presents';
    }

    const nextIdx = QUESTIONS.findIndex(q => q.key === nextField);
    if (nextIdx !== -1) state.currentQuestionIndex = nextIdx;

    updateQuestionDisplay();
    await playLocalAudio(nextField).catch(() => {});
    updateMicStatus('Maintiens pour parler');
  }
}

window.sendButtonValue = sendButtonValue;

// ══════════════════════════════════════════════════════════════
// SOUMISSION DU RAPPORT FINAL
// ══════════════════════════════════════════════════════════════

async function submitReport() {
  // Récupérer les valeurs éditées dans le preview
  document.querySelectorAll('#preview-body .pf-value').forEach(inp => {
    const key = inp.dataset.key;
    const val = inp.value.trim();
    if (val) state.responses[key] = val;
  });

  // Valider les champs date avant envoi
  const dateFields = QUESTIONS.filter(q => q.type === 'date').map(q => q.key);
  const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
  for (const key of dateFields) {
    const val = state.responses[key];
    if (val && !datePattern.test(val)) {
      const label = QUESTIONS.find(q => q.key === key)?.label || key;
      showToast(`Date invalide pour "${label}" — attendu JJ/MM/AAAA`);
      document.getElementById('modal-preview')?.classList.add('visible');
      return;
    }
  }

  document.getElementById('modal-preview')?.classList.remove('visible');
  document.getElementById('loading-text').textContent = 'Envoi du rapport...';
  document.getElementById('loading')?.classList.add('visible');

  // Retry sur erreur réseau pure uniquement (pas sur 5xx : risque de doublon Google Sheets)
  const MAX_RETRIES = 2;
  let lastErr = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      document.getElementById('loading-text').textContent =
        `Réseau instable — tentative ${attempt}/${MAX_RETRIES}…`;
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      const payload = {
        session_id:   state.session_id,
        sender_email: state.user?.email || '',
        sender_name:  state.user?.name || '',
        responses:    state.responses,
        source:       'voice-agent-v3',
        action:       'submit_report'
      };

      let resp;
      if (state.photoFiles.length === 0) {
        resp = await fetch(CONFIG.VOICE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        const fd = new FormData();
        fd.append('data', JSON.stringify(payload));
        state.photoFiles.forEach((f, i) => fd.append(`photo_${i + 1}`, f, f.name));
        resp = await fetch(CONFIG.VOICE_URL, { method: 'POST', body: fd });
      }

      document.getElementById('loading')?.classList.remove('visible');

      if (!resp.ok) {
        console.warn('HTTP error:', resp.status);
        showToast('Attention : erreur serveur, mais le rapport peut avoir été reçu');
      }

      showConfirmation();
      return;

    } catch (e) {
      lastErr = e;
      if (e.name !== 'TypeError') break; // ne pas retenter si ce n'est pas une erreur réseau
    }
  }

  // Toutes les tentatives ont échoué
  console.error('Erreur envoi rapport:', lastErr);
  document.getElementById('loading')?.classList.remove('visible');
  showToast('Erreur réseau : ' + lastErr?.message);
  showConfirmation();
}

window.submitReport = submitReport;

// ══════════════════════════════════════════════════════════════
// BARRE DE TIMEOUT (visuelle pendant l'attente serveur)
// ══════════════════════════════════════════════════════════════

function showTimeoutBar(ms) {
  const wrap = document.getElementById('timeout-bar-wrap');
  const bar = document.getElementById('timeout-bar');
  if (!wrap || !bar) return;
  wrap.classList.add('visible');
  bar.style.transition = 'none';
  bar.style.width = '100%';
  bar.offsetWidth;
  bar.style.transition = `width ${ms}ms linear`;
  bar.style.width = '0%';
}

function hideTimeoutBar() {
  const wrap = document.getElementById('timeout-bar-wrap');
  const bar = document.getElementById('timeout-bar');
  if (!wrap || !bar) return;
  wrap.classList.remove('visible');
  bar.style.transition = 'none';
  bar.style.width = '100%';
}
