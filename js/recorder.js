// ══════════════════════════════════════════════════════════════
// WALKIE-TALKIE PUSH-TO-TALK
// ══════════════════════════════════════════════════════════════
//
// Règles :
// - Démarrer l'enregistrement uniquement si phase === 'idle'
//   (pas si on est en train de parler ou d'envoyer)
// - Si l'utilisateur appuie pendant qu'un audio joue, on stoppe
//   l'audio et on démarre l'enregistrement
// - Si la question courante a des chips ou yes/no (Q7/Q8/Q13),
//   on n'envoie PAS l'audio enregistré au serveur
// ══════════════════════════════════════════════════════════════

let _pttActive = false;
let _currentStream = null;
let _releaseTimer = null;

function setupPTT() {
  const btn = document.getElementById('walkie-btn');
  if (!btn) return;

  btn.addEventListener('touchstart', _handlePTTStart, { passive: false });
  btn.addEventListener('touchend',   _handlePTTEnd,   { passive: false });
  btn.addEventListener('touchcancel',_handlePTTEnd,   { passive: false });

  btn.addEventListener('pointerdown',  _handlePTTStart, { passive: false });
  btn.addEventListener('pointerup',    _handlePTTEnd,   { passive: false });
  btn.addEventListener('pointercancel',_handlePTTEnd,   { passive: false });
  btn.addEventListener('pointerleave', _handlePTTEnd,   { passive: false });

  btn.addEventListener('contextmenu', e => e.preventDefault());
}

async function _handlePTTStart(e) {
  e.preventDefault();
  e.stopPropagation();

  if (_pttActive) return;

  // Si on parle, on stoppe l'audio et on enregistre
  if (state.phase === 'speaking') {
    stopCurrentAudio();
    setPhase('idle');
  }

  if (state.phase !== 'idle') {
    DEBUG && console.log('⛔ PTT bloqué (phase:', state.phase, ')');
    return;
  }

  _pttActive = true;

  if (e.pointerId !== undefined) {
    try {
      document.getElementById('walkie-btn').setPointerCapture(e.pointerId);
    } catch (err) {}
  }

  await startRecording();
}

async function _handlePTTEnd(e) {
  e.preventDefault();
  e.stopPropagation();

  if (!_pttActive) return;
  _pttActive = false;

  await unlockAudio();

  if (state.phase === 'recording') stopRecording();
}

async function startRecording() {
  // Bloquer si la question courante a des boutons (chips ou yes/no)
  // → on bloque dès le départ pour ne même pas ouvrir le micro
  const currentQ = QUESTIONS[state.currentQuestionIndex];
  if (currentQ && (currentQ.type === 'tech-single' || currentQ.type === 'tech-multi' || currentQ.type === 'yesno')) {
    DEBUG && console.log('⚠️ Question avec boutons — micro bloqué');
    showToast('Utilise les boutons pour choisir');
    updateMicStatus('Utilise les boutons ci-dessus');
    _pttActive = false;
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _currentStream = stream;
    state.audioChunks = [];

    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/mp4';
    }

    state.mediaRecorder = new MediaRecorder(stream, { mimeType });

    state.mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) state.audioChunks.push(e.data);
    };

    state.mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());

      const blob = new Blob(state.audioChunks, { type: mimeType });

      // Trop court : on ignore
      if (blob.size < 1000) {
        setPhase('idle');
        updateMicStatus('Maintiens pour parler');
        document.getElementById('walkie-btn')?.classList.remove('listening', 'processing');
        return;
      }

      // Bloquer si déjà en envoi (race condition)
      if (state.phase === 'sending') {
        DEBUG && console.warn('⚠️ Envoi déjà en cours, audio ignoré');
        return;
      }

      const b64 = await _blobToBase64(blob);
      sendToAgent(b64, null);
    };

    state.mediaRecorder.start();
    setPhase('recording');
    document.getElementById('walkie-btn')?.classList.add('listening');
    updateMicStatus('🔴 Parle maintenant...');

  } catch (e) {
    console.error('Erreur micro:', e);
    showToast('Micro non disponible');
    _pttActive = false;
    setPhase('idle');
  }
}

function stopRecording() {
  if (state.mediaRecorder && state.phase === 'recording') {
    state.mediaRecorder.stop();
    document.getElementById('walkie-btn')?.classList.remove('listening');
    document.getElementById('walkie-btn')?.classList.add('processing');
    updateMicStatus('Envoi...');
  }
}

function _blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result
        .replace(/^data:audio\/[^;]+;base64,/, '')
        .replace(/\s+/g, '');
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function updateMicStatus(msg) {
  const el = document.getElementById('mic-status');
  if (el) el.textContent = msg;
}

// Libère le micro quand l'app passe en arrière-plan (iOS garde l'icône active sinon)
function _releaseMediaStream() {
  _releaseTimer = null;
  if (state.mediaRecorder && state.phase === 'recording') {
    try { state.mediaRecorder.stop(); } catch (e) {}
  }
  if (_currentStream) {
    try { _currentStream.getTracks().forEach(t => t.stop()); } catch (e) {}
    _currentStream = null;
  }
  state.mediaRecorder = null;
  _pttActive = false;
  if (state.phase === 'recording') {
    setPhase('idle');
    updateMicStatus('Maintiens pour parler');
    document.getElementById('walkie-btn')?.classList.remove('listening', 'processing');
  }
}

// Debounce d'1s pour ignorer les dialogs système iOS (permission micro)
// qui déclenchent brièvement visibilitychange hidden/visible
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    _releaseTimer = setTimeout(_releaseMediaStream, 1000);
  } else {
    clearTimeout(_releaseTimer);
    _releaseTimer = null;
  }
});
window.addEventListener('pagehide', _releaseMediaStream);
