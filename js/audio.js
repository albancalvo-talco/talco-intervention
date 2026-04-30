// ══════════════════════════════════════════════════════════════
// AUDIO — lecture MP3 pré-enregistrés + sélecteur de voix
// ══════════════════════════════════════════════════════════════
//
// Règle d'or : UN SEUL AUDIO À LA FOIS.
// Tout audio en cours est stoppé avant d'en jouer un nouveau.
//
// Lecture via Web Audio API (decodeAudioData + BufferSource) et
// non via new Audio() : le AudioContext reste actif après un
// enregistrement micro, contrairement à la session AVAudio iOS
// qui change de catégorie (Record → Playback) de façon asynchrone.
// ══════════════════════════════════════════════════════════════

let _audioContext = null;
let _currentSource = null; // BufferSource en cours de lecture

// Débloque l'audio (iOS Safari exige une interaction user pour démarrer)
async function unlockAudio() {
  try {
    if (!_audioContext) {
      _audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioContext.state === 'suspended') {
      await _audioContext.resume();
      state.audioUnlocked = false;
    }
    if (state.audioUnlocked) return true;
    // Ping silencieux pour valider l'unlock iOS
    const buf = _audioContext.createBuffer(1, 1, 22050);
    const src = _audioContext.createBufferSource();
    src.buffer = buf;
    src.connect(_audioContext.destination);
    src.start(0);
    state.audioUnlocked = true;
    return true;
  } catch (e) {
    state.audioUnlocked = true;
    return true;
  }
}

// iOS suspend l'AudioContext quand l'app passe en arrière-plan.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && _audioContext?.state === 'suspended') {
    state.audioUnlocked = false;
  }
});

// Stoppe tout audio en cours (sans erreur)
function stopCurrentAudio() {
  if (_currentSource) {
    try { _currentSource.stop(); } catch (e) {}
    _currentSource = null;
  }
  // Legacy : au cas où state.currentAudio serait encore référencé ailleurs
  if (state.currentAudio) {
    try { state.currentAudio.pause(); state.currentAudio.src = ''; } catch (e) {}
    state.currentAudio = null;
  }
}

// Joue un audio local via Web Audio API.
// Retourne une Promise qui se résout à la fin de la lecture (ou en cas d'erreur).
async function playLocalAudio(fieldKey) {
  stopCurrentAudio();
  await unlockAudio();

  const url = `${CONFIG.AUDIO_BASE_PATH}/${state.selectedVoice}/${fieldKey}.mp3`;
  DEBUG && console.log('🔊 playLocalAudio:', fieldKey, '→', url);

  setPhase('speaking');

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const arrayBuffer = await resp.arrayBuffer();
    const audioBuffer = await _audioContext.decodeAudioData(arrayBuffer);

    await new Promise(resolve => {
      const source = _audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(_audioContext.destination);
      _currentSource = source;

      source.onended = () => {
        if (_currentSource === source) _currentSource = null;
        if (state.phase === 'speaking') setPhase('idle');
        resolve();
      };

      source.start(0);
    });
  } catch (e) {
    console.warn('❌ Audio erreur:', fieldKey, e);
    _currentSource = null;
    if (state.phase === 'speaking') setPhase('idle');
  }
}

// ══════════════════════════════════════════════════════════════
// SÉLECTEUR DE VOIX (dropdown header)
// ══════════════════════════════════════════════════════════════

window.toggleVoiceDropdown = function() {
  const dd = document.getElementById('voice-dropdown');
  const btn = document.getElementById('voice-btn');
  const isOpen = dd.classList.contains('open');
  dd.classList.toggle('open', !isOpen);
  btn.classList.toggle('open', !isOpen);
  if (!isOpen) {
    setTimeout(() => document.addEventListener('click', _closeVoiceOnClick, { once: true }), 0);
  }
};

function _closeVoiceOnClick(e) {
  if (!document.getElementById('voice-selector').contains(e.target)) {
    document.getElementById('voice-dropdown').classList.remove('open');
    document.getElementById('voice-btn').classList.remove('open');
  }
}

window.selectVoice = async function(voiceId) {
  await unlockAudio();
  state.selectedVoice = voiceId;
  localStorage.setItem(STORAGE_KEYS.VOICE, voiceId);

  document.getElementById('voice-btn-label').textContent = voiceId.toUpperCase();
  document.querySelectorAll('.voice-option').forEach(el => {
    const isActive = el.dataset.voice === voiceId;
    el.classList.toggle('active', isActive);
    el.querySelector('.vo-name')?.classList.toggle('active', isActive);
  });
  document.getElementById('voice-dropdown').classList.remove('open');
  document.getElementById('voice-btn').classList.remove('open');
  showToast('Voix : ' + voiceId);
};

function initVoiceSelector() {
  const labelEl = document.getElementById('voice-btn-label');
  if (labelEl) labelEl.textContent = state.selectedVoice.toUpperCase();
  document.querySelectorAll('.voice-option').forEach(el => {
    const isActive = el.dataset.voice === state.selectedVoice;
    el.classList.toggle('active', isActive);
    el.querySelector('.vo-name')?.classList.toggle('active', isActive);
  });
}
