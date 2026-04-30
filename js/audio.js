// ══════════════════════════════════════════════════════════════
// AUDIO — lecture MP3 pré-enregistrés + sélecteur de voix
// ══════════════════════════════════════════════════════════════
//
// Règle d'or : UN SEUL AUDIO À LA FOIS.
// Tout audio en cours est stoppé avant d'en jouer un nouveau.
// Cela évite les boucles / chevauchements observés avant.
// ══════════════════════════════════════════════════════════════

let _audioContext = null;

// Débloque l'audio (iOS Safari exige une interaction user pour démarrer)
async function unlockAudio() {
  if (state.audioUnlocked) return true;
  try {
    if (!_audioContext) {
      _audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioContext.state === 'suspended') {
      await _audioContext.resume();
    }
    // Ping silencieux pour valider l'unlock iOS
    const buffer = _audioContext.createBuffer(1, 1, 22050);
    const source = _audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(_audioContext.destination);
    source.start(0);
    state.audioUnlocked = true;
    return true;
  } catch (e) {
    state.audioUnlocked = true; // ne pas bloquer
    return true;
  }
}

// Stoppe tout audio en cours (sans erreur)
function stopCurrentAudio() {
  if (state.currentAudio) {
    try {
      state.currentAudio.pause();
      state.currentAudio.src = ''; // libère la ressource
    } catch (e) {}
    state.currentAudio = null;
  }
}

// Joue un audio local pour un champ donné
// Retourne une Promise qui se résout à la fin de la lecture (ou en cas d'erreur)
async function playLocalAudio(fieldKey) {
  // Toujours stopper le précédent
  stopCurrentAudio();

  const url = `${CONFIG.AUDIO_BASE_PATH}/${state.selectedVoice}/${fieldKey}.mp3`;
  DEBUG && console.log('🔊 playLocalAudio:', fieldKey, '→', url);

  return new Promise(resolve => {
    const audio = new Audio(url);
    state.currentAudio = audio;
    setPhase('speaking');

    let resolved = false;
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      // Si c'est encore l'audio courant, on remet à null
      if (state.currentAudio === audio) {
        state.currentAudio = null;
        // Retour idle uniquement si on est encore en speaking
        if (state.phase === 'speaking') setPhase('idle');
      }
      resolve();
    };

    audio.onended = cleanup;
    audio.onerror = (e) => {
      console.warn('❌ Audio non trouvé:', url, e);
      cleanup();
    };

    audio.play().catch(err => {
      console.warn('❌ play() échec:', err);
      cleanup();
    });
  });
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
