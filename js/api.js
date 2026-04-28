// ══════════════════════════════════════════════════════════════
// API — Communication avec le backend n8n
// ══════════════════════════════════════════════════════════════
//
// sendToAgent : envoie audio_base64 ou text_input au webhook
// submitReport : envoie le rapport final (avec photos)
//
// Garde anti-double-envoi via state.phase + lastSendTime.
// Aucun audio joué pendant la phase __init__ (isInitPhase=true).
// ══════════════════════════════════════════════════════════════

async function sendToAgent(audioBase64, textInput) {
  // Garde 1 : phase
  if (state.phase === 'sending') {
    console.warn('⚠️ sendToAgent déjà en cours');
    return;
  }

  // Garde 2 : throttle (anti-double-clic rapide)
  const now = Date.now();
  if (state.lastSendTime && (now - state.lastSendTime) < 800) {
    console.warn('⚠️ Appel trop rapide, ignoré');
    return;
  }
  state.lastSendTime = now;

  setPhase('sending');
  document.getElementById('walkie-btn')?.classList.add('processing');
  updateMicStatus('Envoi...');
  showTimeoutBar(CONFIG.TIMEOUT_MS);

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

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT_MS);

    const resp = await fetch(CONFIG.VOICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });

    clearTimeout(timeout);
    hideTimeoutBar();

    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    data = await resp.json();

    state.history = data.history || state.history;
    state.responses = { ...state.responses, ...(data.responses || {}) };
    state.is_complete = data.is_complete || false;

    if (state.writingMode) syncWritingPanelValues();

  } catch (e) {
    hideTimeoutBar();
    const msg = e.name === 'AbortError' ? 'Timeout' : e.message;
    showToast('Erreur : ' + msg);
    updateMicStatus('Erreur — réessaie');
    setPhase('idle');
    return;
  }

  // Sortir de 'sending'
  document.getElementById('walkie-btn')?.classList.remove('processing', 'listening');

  // Phase init : pas d'audio, pas d'affichage de question
  // (on reste en idle — l'utilisateur cliquera sur "Commencer")
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

    // ──────────────────────────────────────────────────────────
    // AUTO-SKIP : si la prochaine question est 'redacteur' et
    // qu'on l'a déjà rempli via Google, on saute à la suivante
    // ──────────────────────────────────────────────────────────
    if (nextField === 'redacteur' && state.responses.redacteur) {
      console.log('⏭️ Auto-skip redacteur (déjà rempli via Google)');
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
// SOUMISSION DU RAPPORT FINAL
// ══════════════════════════════════════════════════════════════

async function submitReport() {
  // Récupérer les valeurs éventuellement éditées dans le preview
  document.querySelectorAll('#preview-body .pf-value').forEach(inp => {
    const key = inp.dataset.key;
    const val = inp.value.trim();
    if (val) state.responses[key] = val;
  });

  document.getElementById('modal-preview')?.classList.remove('visible');
  document.getElementById('loading-text').textContent = 'Envoi du rapport...';
  document.getElementById('loading')?.classList.add('visible');

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

  } catch (e) {
    console.error('Erreur envoi rapport:', e);
    document.getElementById('loading')?.classList.remove('visible');
    showToast('Erreur réseau : ' + e.message);
    showConfirmation();
  }
}

// Expose globalement (utilisé par les boutons HTML inline)
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
