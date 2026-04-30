// ══════════════════════════════════════════════════════════════
// APP — Bootstrap + orchestration
// ══════════════════════════════════════════════════════════════

// Hook appelé par auth.js après authentification réussie
function onUserAuthenticated(user) {
  state.user = user;

  const av = document.getElementById('user-avatar');
  if (user.picture) {
    const img = document.createElement('img');
    img.src = user.picture;
    img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
    av.textContent = '';
    av.appendChild(img);
  } else {
    av.textContent = user.initials;
  }
  document.getElementById('user-name').textContent = user.name.split(' ')[0];

  startSession();
}

// Démarre une nouvelle session
function startSession() {
  state.session_id = 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  state.history = [];
  state.responses = {};
  state.is_complete = false;
  setPhase('idle');
  state.photoFiles = [];
  state.photoUrls = [];
  state.currentQuestionIndex = 0;
  state.lastSendTime = 0;
  state.isInitPhase = false;

  // Auto-fill redacteur + techniciens_presents depuis Google
  autofillFromGoogle();
  stopCurrentAudio();
  closeWritingPanel();

  document.getElementById('mic-zone')?.classList.remove('started');
  document.getElementById('question-content').style.display = 'none';
  document.getElementById('start-button-zone').style.display = 'none';
  document.getElementById('connection-state')?.classList.remove('visible');
  document.getElementById('walkie-btn')?.classList.remove('listening', 'processing', 'speaking');

  // Restaurer les boutons Audio/Écrit
  const btnsWrapper = document.querySelector('.mic-start-state .buttons-wrapper');
  if (btnsWrapper) btnsWrapper.style.display = 'flex';

  updateMicStatus('Maintiens pour parler');
  hideTimeoutBar();
  showScreen('chat');
}

window.newSession = function() { startSession(); };

// ══════════════════════════════════════════════════════════════
// DÉMARRAGE DU RAPPORT
// ══════════════════════════════════════════════════════════════
//
// Note : on n'ajoute PLUS la classe `started` sur mic-zone ici.
// Elle sera ajoutée seulement après le clic sur "Commencer"
// (cf. ui-questions.js → showStartButton → startBtn.onclick).
// Cela évite que le walkie-talkie apparaisse pendant l'écran
// "Prêt à commencer ?".
//
// ══════════════════════════════════════════════════════════════

window.startReport = async function() {
  await unlockAudio();
  
  document.querySelector('.mic-start-state .buttons-wrapper').style.display = 'none';

  // Affiche la zone de connexion (antenne)
  document.getElementById('connection-state').classList.add('visible');

  if (state.history.length === 0 && state.phase === 'idle') {

    // Init en parallèle : audio init + appel serveur
    const initAudio = playLocalAudio('init').catch(() => {});
    const serverInit = sendToAgent(null, '__init__');

    await Promise.all([initAudio, serverInit]);

    state.isInitPhase = false;
  }

  document.getElementById('connection-state').classList.remove('visible');
  showStartButton();
};

// ══════════════════════════════════════════════════════════════
// HOOK STATE MACHINE → UI
// ══════════════════════════════════════════════════════════════

function onPhaseChange(newPhase, oldPhase) {
  const btn = document.getElementById('walkie-btn');
  if (!btn) return;

  // Reset toutes les classes spécifiques aux phases
  btn.classList.remove('listening', 'processing', 'speaking');

  if (newPhase === 'recording') {
    btn.classList.add('listening');
  } else if (newPhase === 'sending') {
    btn.classList.add('processing');
  } else if (newPhase === 'speaking') {
    btn.classList.add('speaking');
    updateMicStatus('TALCO-IA parle...');
  } else if (newPhase === 'idle') {
    if (oldPhase === 'speaking' && !state.is_complete) {
      updateMicStatus('Maintiens pour parler');
    }
  }
}

// ══════════════════════════════════════════════════════════════
// BOOTSTRAP
// ══════════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', () => {
  initVoiceSelector();
  setupPTT();
  setupAuthFallback();

  // Charger session si valide
  const saved = loadUserSession();
  if (saved) onUserAuthenticated(saved);
});
