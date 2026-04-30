// ══════════════════════════════════════════════════════════════
// ÉTAT GLOBAL
// ══════════════════════════════════════════════════════════════
//
// PHASES (state machine claire) :
//   - 'idle'        : rien ne se passe, on attend une action user
//   - 'recording'   : micro ouvert, user parle
//   - 'sending'     : audio/texte envoyé au serveur, on attend réponse
//   - 'speaking'    : audio de la prochaine question en train d'être joué
//   - 'complete'    : rapport complet, en attente d'envoi
//
// Une seule phase à la fois, jamais 2.
// Toute transition passe par setPhase().
// ══════════════════════════════════════════════════════════════

const state = {
  // Auth
  user: null,

  // Session
  session_id: null,
  history: [],
  responses: {},
  is_complete: false,

  // Phase courante (state machine)
  phase: 'idle',

  // Audio
  currentAudio: null,
  audioUnlocked: false,
  selectedVoice: localStorage.getItem(STORAGE_KEYS.VOICE) || 'onyx',

  // Recorder
  mediaRecorder: null,
  audioChunks: [],

  // Photos
  photoFiles: [],
  photoUrls: [],

  // Mode écrit
  writingMode: false,
  writingIndex: 0,

  // Question courante
  currentQuestionIndex: 0,

  // Garde anti-double-envoi
  lastSendTime: 0,

  // Init phase (bloque l'audio des questions pendant l'init __init__)
  isInitPhase: false
};

// ══════════════════════════════════════════════════════════════
// STATE MACHINE — toute transition passe ici
// ══════════════════════════════════════════════════════════════
function setPhase(newPhase) {
  const old = state.phase;
  if (old === newPhase) return;
  DEBUG && console.log(`📍 Phase : ${old} → ${newPhase}`);
  state.phase = newPhase;
  // Notifier l'UI
  if (typeof onPhaseChange === 'function') onPhaseChange(newPhase, old);
}

function isBusy() {
  return state.phase !== 'idle';
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name)?.classList.add('active');
}

function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), duration);
}

function escHtml(t) {
  return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ══════════════════════════════════════════════════════════════
// MATCHING NOM GOOGLE → TECHNICIEN
// ══════════════════════════════════════════════════════════════
// Règle : on normalise (NFD, retire accents, lowercase) puis on
// vérifie que TOUS les mots du nom Google sont présents dans le
// nom du technicien (ou inversement).
// Ex: "Yonis Peres" Google → "Yonis Peres" technicien   ✓
// Ex: "Jean-François Cuesta" Google → "Jean François Cuesta" ✓
// Ex: "Yonis P." Google → "Yonis Peres" si Yonis unique  ✓
// Ex: "Bob Martin" Google → null (pas trouvé)            → fallback manuel
// ══════════════════════════════════════════════════════════════
function normalizeName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')      // accents
    .replace(/[-'.]/g, ' ')                // ponctuation → espace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function matchTechnicien(googleName) {
  if (!googleName) return null;
  const gNorm = normalizeName(googleName);
  const gWords = gNorm.split(' ').filter(w => w.length >= 2);
  if (gWords.length === 0) return null;

  // 1. Match exact (après normalisation)
  for (const tech of TECHNICIENS) {
    if (normalizeName(tech) === gNorm) return tech;
  }

  // 2. Match partiel : tous les mots Google présents dans le tech
  const candidates = TECHNICIENS.filter(tech => {
    const tNorm = normalizeName(tech);
    return gWords.every(w => tNorm.includes(w));
  });
  if (candidates.length === 1) return candidates[0];

  // 3. Match inverse : tous les mots du tech présents dans Google
  const candidates2 = TECHNICIENS.filter(tech => {
    const tWords = normalizeName(tech).split(' ').filter(w => w.length >= 2);
    return tWords.every(w => gNorm.includes(w));
  });
  if (candidates2.length === 1) return candidates2[0];

  return null;
}

// Pré-remplit redacteur si match Google trouvé.
// Note : on NE pré-remplit PAS techniciens_presents pour ne pas sauter Q8.
// Le pré-cochage du chip dans Q8 se fait dans ui-questions.js → _renderChips()
// (basé sur state.responses.redacteur), sans toucher à state.responses.techniciens_presents.
function autofillFromGoogle() {
  if (!state.user || !state.user.name) return;
  const matched = matchTechnicien(state.user.name);
  if (!matched) {
    DEBUG && console.log('🔍 Aucun match technicien pour:', state.user.name);
    return;
  }
  DEBUG && console.log('✅ Match technicien Google:', state.user.name, '→', matched);
  state.responses.redacteur = matched;
  // PAS de pré-remplissage de techniciens_presents : on veut que Q8 soit posée,
  // avec ce nom déjà coché en pré-sélection (cf. _renderChips).
}
