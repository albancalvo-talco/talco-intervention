// ══ VOICE CHAT — Logique agent vocal ══

const FIELD_LABELS = {
  nom_client:'Client', numero_affaire:'Affaire',
  date_debut:'Début', date_fin:'Fin',
  heure_debut:'H.début', heure_fin:'H.fin',
  redacteur:'Rédacteur', techniciens_presents:'Techniciens',
  clients_presents:'Clients site', type_intervention:'Type',
  designation_precise:'Description', raison_intervention:'Raison',
  chantier_termine:'Terminé', si_non_details:'Reste à faire',
  difficultes:'Difficultés', points_attention:'Points attention'
};
const FIELD_ORDER = Object.keys(FIELD_LABELS);

let state = {
  user:null, session_id:null, history:[], responses:{},
  is_complete:false, isListening:false, isProcessing:false,
  mediaRecorder:null, audioChunks:[], currentAudio:null
};
let continuousMode = true;
let convCount = 0;

// ══ INIT ══
window.addEventListener('DOMContentLoaded', () => {
  injectLogos();
  initAuth();
});

// Appelé par common.js après auth réussie
function onUserAuthenticated(user) {
  state.user = user;
  document.getElementById('user-name').textContent = user.name.split(' ')[0];
  const av = document.getElementById('user-avatar');
  if(user.picture) av.innerHTML = `<img src="${user.picture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  else av.textContent = user.initials;
  startSession();
}

function startSession() {
  state.session_id = `session_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  state.history = []; state.responses = {}; state.is_complete = false; convCount = 0;
  document.getElementById('conv-history').innerHTML = '';
  document.getElementById('conv-count').textContent = '0';
  document.getElementById('conv-panel')?.classList.remove('open');
  document.getElementById('conv-toggle')?.classList.remove('open');
  updateFieldsRecap();
  showScreen('chat');
  sendToAgent(null, '__init__');
}

function newSession() {
  startSession();
}

// ══ CONVERSATION PANEL ══
function toggleConvPanel() {
  document.getElementById('conv-panel').classList.toggle('open');
  document.getElementById('conv-toggle').classList.toggle('open');
}

// ══ MICRO ══
function unlockAudio() {
  if(window._audioUnlocked) return;
  window._audioUnlocked = true;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ctx.createBuffer(1,1,22050);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(ctx.destination); src.start(0);
    setTimeout(() => ctx.close(), 500);
  } catch(e) {}
  // Jouer l'audio en attente si présent
  if(window._pendingAudio) {
    const {base64, resolve} = window._pendingAudio;
    window._pendingAudio = null;
    _playAudioNow(base64, resolve);
  }
}

async function handleOrbClick() {
  if(state.isProcessing) return;
  unlockAudio();
  if(state.isListening) stopRecording();
  else await startRecording();
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    state.audioChunks = [];
    state.mediaRecorder = new MediaRecorder(stream, {mimeType:'audio/webm'});
    state.mediaRecorder.ondataavailable = e => { if(e.data.size>0) state.audioChunks.push(e.data); };
    state.mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(state.audioChunks, {type:'audio/webm'});
      const b64 = await blobToBase64(blob);
      sendToAgent(b64, null);
    };
    state.mediaRecorder.start();
    state.isListening = true;
    document.getElementById('orb-wrap').classList.add('listening');
    setOrbState('listening');
    document.getElementById('orb-status').textContent = 'Écoute en cours...';
    document.getElementById('orb-status').className = 'orb-status listening';
  } catch(e) {
    showToast('Micro non disponible : ' + e.message);
  }
}

function stopRecording() {
  if(state.mediaRecorder && state.isListening) {
    state.mediaRecorder.stop();
    state.isListening = false;
    document.getElementById('orb-wrap').classList.remove('listening');
    setOrbState('processing');
    document.getElementById('orb-status').textContent = 'Traitement...';
    document.getElementById('orb-status').className = 'orb-status processing';
  }
}

function blobToBase64(blob) {
  return new Promise((res,rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function toggleContinuousMode() {
  continuousMode = !continuousMode;
  const bar   = document.getElementById('mode-bar');
  const label = document.getElementById('mode-label');
  bar.className = 'mode-bar' + (continuousMode ? ' on' : '');
  label.textContent = continuousMode ? 'Continu activé' : 'Mode continu';
  if(continuousMode && !state.isListening && !state.isProcessing) startRecording();
  else if(!continuousMode) showToast('Mode continu désactivé');
}

// ══ AGENT ══
async function sendToAgent(audioBase64, textInput) {
  if(state.isProcessing) return;
  state.isProcessing = true;
  document.getElementById('sending-indicator').classList.add('visible');
  if(audioBase64) addBubble('user', '🎤 Message vocal');
  const typingId = 'typing-' + Date.now();
  addTyping(typingId);

  try {
    const payload = {
      session_id:   state.session_id,
      sender_email: state.user.email,
      sender_name:  state.user.name,
      history:      state.history,
      responses:    state.responses
    };
    if(audioBase64)              payload.audio_base64 = audioBase64;
    if(textInput === '__init__') payload.text_input   = '__init__';

    const resp = await fetch(CONFIG.VOICE_URL, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();

    removeTyping(typingId);
    state.history   = data.history   || state.history;
    state.responses = {...state.responses, ...(data.responses||{})};
    state.is_complete = data.is_complete || false;

    if(data.speech) addBubble('agent', data.speech);
    updateFieldsRecap();

    if(data.audio_base64) await playAudio(data.audio_base64);

    if(continuousMode && !state.is_complete)
      setTimeout(() => startRecording(), 500);

    if(state.is_complete) {
      setOrbState('idle');
      document.getElementById('orb-status').textContent = 'Rapport complet ✓';
      document.getElementById('orb-status').className = 'orb-status';
      document.getElementById('orb-wrap').style.opacity = '.4';
      document.getElementById('orb-wrap').style.pointerEvents = 'none';
    }

  } catch(e) {
    removeTyping(typingId);
    addBubble('agent', 'Désolé, une erreur s\'est produite. Réessaie.');
    showToast('Erreur : ' + e.message);
  } finally {
    state.isProcessing = false;
    document.getElementById('sending-indicator').classList.remove('visible');
    if(!state.is_complete && !state.currentAudio) {
      setOrbState('idle');
      document.getElementById('orb-status').textContent = 'Appuie pour parler';
      document.getElementById('orb-status').className = 'orb-status';
    }
  }
}

// ══ AUDIO TTS ══
function _playAudioNow(base64, resolve) {
  try {
    if(state.currentAudio) { try{state.currentAudio.pause();}catch(e){} state.currentAudio=null; }
    const raw   = base64.replace(/^data:audio\/[^;]+;base64,/,'');
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
    const blob  = new Blob([bytes], {type:'audio/mpeg'});
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    state.currentAudio = audio;
    setOrbState('speaking');
    document.getElementById('orb-status').textContent = 'TALCO-IA parle...';
    document.getElementById('orb-status').className   = 'orb-status speaking';
    audio.onended = () => { URL.revokeObjectURL(url); state.currentAudio=null; resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); state.currentAudio=null; resolve(); };
    audio.play().catch(e => { console.error('play() failed:', e); URL.revokeObjectURL(url); state.currentAudio=null; resolve(); });
  } catch(e) { console.error(e); resolve(); }
}

async function playAudio(base64) {
  return new Promise(resolve => {
    if(!base64) { resolve(); return; }
    if(window._audioUnlocked) {
      _playAudioNow(base64, resolve);
    } else {
      window._pendingAudio = {base64, resolve};
      setOrbState('speaking');
      document.getElementById('orb-status').textContent = 'Appuie sur l\'orbe pour écouter';
      document.getElementById('orb-status').className   = 'orb-status speaking';
    }
  });
}

// ══ UI ══
function addBubble(role, text) {
  const hist = document.getElementById('conv-history');
  const div  = document.createElement('div');
  div.className = 'bubble ' + role;
  const label = role==='agent' ? 'TALCO-IA' : state.user.name.split(' ')[0];
  div.innerHTML = `<div class="bubble-label">${label}</div>${escHtml(text)}`;
  hist.appendChild(div);
  hist.scrollTop = hist.scrollHeight;
  convCount++;
  const countEl = document.getElementById('conv-count');
  if(countEl) countEl.textContent = convCount;
  if(convCount === 1) {
    document.getElementById('conv-panel')?.classList.add('open');
    document.getElementById('conv-toggle')?.classList.add('open');
  }
}

function addTyping(id) {
  const hist = document.getElementById('conv-history');
  const div  = document.createElement('div');
  div.className='bubble typing'; div.id=id;
  div.innerHTML='<div class="typing-dots"><span></span><span></span><span></span></div>';
  hist.appendChild(div);
  hist.scrollTop = hist.scrollHeight;
}

function removeTyping(id) { document.getElementById(id)?.remove(); }

function updateFieldsRecap() {
  const recap = document.getElementById('fields-recap');
  recap.innerHTML = '';
  FIELD_ORDER.forEach(key => {
    const val  = state.responses[key];
    const chip = document.createElement('div');
    chip.className = 'field-chip' + (val ? ' done' : '');
    chip.innerHTML = `<div class="fc-dot"></div><span class="fc-label">${FIELD_LABELS[key]}</span>`;
    if(val) chip.title = val;
    recap.appendChild(chip);
  });
}

function setOrbState(s) {
  document.getElementById('orb-bg').className   = 'orb-layer orb-bg '   + s;
  document.getElementById('orb-wave').className = 'orb-wave '            + s;
}
