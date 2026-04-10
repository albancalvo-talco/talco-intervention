// ══ PWA v8 — Logique formulaire guidé (corrigé) ══

const QUESTIONS = [
  {key:'nom_client',           text:"Nom du client ?",                                  hint:"",                                        cat:"identification"},
  {key:'numero_affaire',       text:"Numéro d'affaire ?",                               hint:"ex : 2025-042",                           cat:"identification"},
  {key:'date_debut',           text:"Date de début ?",                                  hint:"ex : 17/03/2026",                         cat:"dates & horaires"},
  {key:'date_fin',             text:"Date de fin ?",                                    hint:"ex : 17/03/2026",                         cat:"dates & horaires"},
  {key:'heure_debut',          text:"Heure de début ?",                                 hint:"ex : 09h30",                              cat:"dates & horaires"},
  {key:'heure_fin',            text:"Heure de fin ?",                                   hint:"ex : 17h00",                              cat:"dates & horaires"},
  {key:'redacteur',            text:"Ton prénom et nom ?",                              hint:"ex : Yonis Peres",                        cat:"équipe"},
  {key:'techniciens_presents', text:"Techniciens présents ?",                           hint:"toi + autres, séparés par virgules",      cat:"équipe"},
  {key:'clients_presents',     text:"Clients présents sur site ?",                      hint:"ou dis : rien",                           cat:"équipe"},
  {key:'type_intervention',    text:"Type d'intervention ?",                            hint:"Installation / Maintenance / Dépannage…", cat:"intervention"},
  {key:'designation_precise',  text:"Désignation précise — décris ce qui a été fait.", hint:"",                                        cat:"intervention"},
  {key:'raison_intervention',  text:"Raison de l'intervention ?",                      hint:"pourquoi cette intervention",             cat:"intervention"},
  {key:'chantier_termine',     text:"Chantier terminé ?",                               hint:"oui ou non",                              cat:"bilan"},
  {key:'si_non_details',       text:"Qu'est-ce qu'il reste à faire ?",                  hint:"matériel, accès, config...",              cat:"bilan"},
  {key:'difficultes',          text:"Difficultés rencontrées ?",                        hint:"ou dis : rien",                           cat:"bilan"},
  {key:'points_attention',     text:"Points d'attention pour le prochain ?",            hint:"ou dis : rien",                           cat:"bilan"}
];

let state = {
  user:null, step:0, responses:{},
  photos:[], photoFiles:[],
  isListening:false, isSpeaking:false,
  recognition:null, synth:window.speechSynthesis,
  transcript:'', inPhotoMode:false,
  awaitingConfirmation:false, pendingAction:null, orbOpen:false
};

// ══ INIT ══
window.addEventListener('DOMContentLoaded', () => {
  injectLogos();
  initAuth();
});

function onUserAuthenticated(user) {
  state.user = user;
  const av = document.getElementById('user-avatar');
  if(user.picture) av.innerHTML = `<img src="${user.picture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  else av.textContent = user.initials;
  document.getElementById('user-name').textContent = user.name.split(' ')[0];
  state.step=0; state.responses={}; state.photos=[]; state.photoFiles=[]; state.inPhotoMode=false;
  showScreen('rapport');
  initSpeechRecognition();
  renderStep();
}

// ══ RENDU ══
function renderStep() {
  if(state.inPhotoMode){ renderPhotoMode(); return; }
  state.awaitingConfirmation=false; state.pendingAction=null; state.transcript='';
  const q = QUESTIONS[state.step]; if(!q) return;
  document.getElementById('progress-fill').style.width = (state.step/QUESTIONS.length*100)+'%';
  document.getElementById('progress-label').textContent = `${state.step+1} / ${QUESTIONS.length}`;
  document.getElementById('tile-cat').textContent = q.cat;
  document.getElementById('tile-question').textContent = q.text;
  document.getElementById('tile-hint').textContent = q.hint;
  document.getElementById('tile-answer-box').style.display = '';
  document.getElementById('tile-answer-box').className = 'tile-answer-box';
  document.getElementById('tile-answer-box').innerHTML = `<span class="tile-answer-placeholder" id="tile-answer-ph">Appuie sur le micro pour répondre...</span>`;
  document.getElementById('tile-norm').innerHTML = '';
  document.getElementById('tile-photos-content').style.display = 'none';
  document.getElementById('tile-active').classList.remove('orb-open');
  document.getElementById('bottom-bar').style.display = 'none';
  rebuildHistory();

  // FIX #6 : trim() + toLowerCase() pour éviter " OUI " ou "oui" qui rate le skip
  if(state.step===13 && state.responses.chantier_termine?.trim().toLowerCase()==='oui'){
    state.responses.si_non_details=''; state.step=14; renderStep(); return;
  }

  openOrb();
  const intro = state.step===0
    ? `Bonjour ${state.user.name.split(' ')[0]}. Je vais vous guider pour remplir le rapport. ${q.text}`
    : q.text;
  setTimeout(()=>speak(intro,()=>{}), 150);
}

function renderPhotoMode() {
  document.getElementById('progress-fill').style.width = '97%';
  document.getElementById('progress-label').textContent = 'Photos';
  document.getElementById('tile-cat').textContent = 'documentation';
  document.getElementById('tile-question').textContent = 'Photos du chantier';
  document.getElementById('tile-hint').textContent = '1 à 5 photos · appuie sur le carré pour ajouter';
  document.getElementById('tile-answer-box').style.display = 'none';
  document.getElementById('tile-norm').innerHTML = '';
  document.getElementById('tile-photos-content').style.display = 'flex';
  document.getElementById('tile-active').classList.remove('orb-open');
  rebuildHistory();
  closeOrb();
  document.getElementById('bottom-bar').style.display = 'block';
  speak('Parfait. Ajoutez vos photos si nécessaire, puis terminez le rapport.');
}

// ══ HISTORIQUE ══
function rebuildHistory() {
  const hz = document.getElementById('history-zone');
  const sep = document.getElementById('zone-sep');
  hz.innerHTML = '';
  for(let i=state.step-1; i>=0; i--) {
    const q = QUESTIONS[i]; if(!q) continue;
    const d = document.createElement('div');
    d.className = 'tile-past';
    const a = state.responses[q.key]||'—';
    d.innerHTML = `<div class="tp-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg></div><div class="tp-content"><div class="tp-q">${q.text}</div><div class="tp-a">${a.slice(0,45)}${a.length>45?'…':''}</div></div>`;
    hz.appendChild(d);
  }
  sep.className = 'zone-separator' + (state.step>0 ? '' : ' hidden');
  hz.scrollTop = 0;
}

// ══ ORB ══
function openOrb() {
  state.orbOpen = true;
  const q = QUESTIONS[state.step];
  document.getElementById('orb-q-label').textContent = q ? q.text : '';
  document.getElementById('orb-text').innerHTML = '<span class="ph">Appuie sur le micro...</span>';
  document.getElementById('orb-norm').innerHTML = '';
  document.getElementById('orb-valid').style.display = 'none';
  document.getElementById('orb-reprendre').style.display = 'none';
  setOrbState('idle');
  document.getElementById('tile-active').classList.add('orb-open');
  document.getElementById('orb-panel').classList.add('open');
}
function closeOrb() {
  state.orbOpen = false;
  document.getElementById('tile-active').classList.remove('orb-open');
  document.getElementById('orb-panel').classList.remove('open');
}
function setOrbState(s) {
  document.getElementById('orb-bg').className = 'orb-layer orb-bg ' + s;
  document.getElementById('orb-wave').className = 'orb-wave ' + s;
}

// ══ STT ══
function initSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ showToast('Reconnaissance vocale : Chrome requis'); return; }
  state.recognition = new SR();
  state.recognition.lang='fr-FR'; state.recognition.continuous=false; state.recognition.interimResults=true;

  state.recognition.onresult = (e) => {
    let interim='', final='';
    for(let i=e.resultIndex; i<e.results.length; i++) {
      if(e.results[i].isFinal) final+=e.results[i][0].transcript;
      else interim+=e.results[i][0].transcript;
    }
    const raw = (final||interim).trim();

    if(state.awaitingConfirmation) {
      if(final) {
        const cmd = normalizeCmd(final);
        if(cmd==='valider'){ stopListening(); confirmerAction(); return; }
        if(cmd==='reprendre'){ stopListening(); annulerConfirmation(); return; }
        showToast('Dis "valider" ou "reprendre"');
      }
      setOrbTranscript(raw,!final); setTileAnswer(raw,!final); return;
    }

    if(final) {
      const cmd = normalizeCmd(final);
      if(cmd==='valider' && state.transcript){ stopListening(); demanderConfirmation('valider'); return; }
      if(cmd==='passer'){ stopListening(); demanderConfirmation('passer'); return; }
      if(cmd==='reprendre'){ stopListening(); reprendreChamp(); return; }
      state.transcript=final;
      setOrbTranscript(state.transcript,false);
      setTileAnswer(state.transcript,false);
      stopListening();
      normaliserChamp(state.transcript);
      return;
    }
    state.transcript=raw; setOrbTranscript(raw,true); setTileAnswer(raw,true);
  };

  state.recognition.onerror = (e) => {
    stopListening();
    if(e.error!=='no-speech') showToast('Micro : '+e.error);
  };
  state.recognition.onend = () => { if(state.isListening) stopListening(); };
}

function toggleMic() {
  if(state.isSpeaking){ state.synth.cancel(); state.isSpeaking=false; setOrbState('idle'); }
  state.isListening ? stopListening() : startListening();
}
function startListening() {
  if(!state.recognition) return;
  state.isListening=true; setOrbState('listening');
  document.getElementById('tile-answer-box').classList.add('listening');
  document.getElementById('orb-mic').classList.add('listening');
  if(!state.awaitingConfirmation) {
    state.transcript='';
    const ph=document.getElementById('tile-answer-ph'); if(ph) ph.textContent='🎤 En cours...';
    document.getElementById('orb-text').innerHTML='<span class="ph">🎤 Parle maintenant...</span>';
  }
  try{ state.recognition.start(); }catch(e){}
}
function stopListening() {
  state.isListening=false; setOrbState('idle');
  document.getElementById('tile-answer-box').classList.remove('listening');
  document.getElementById('orb-mic').classList.remove('listening');
  try{ state.recognition.stop(); }catch(e){}
}
function setOrbTranscript(t,interim) {
  document.getElementById('orb-text').innerHTML = t+(interim?'<span style="color:var(--text2)">…</span>':'');
}
function setTileAnswer(t,interim) {
  if(state.inPhotoMode) return;
  const box=document.getElementById('tile-answer-box');
  const ph=document.getElementById('tile-answer-ph'); if(ph) ph.style.display='none';
  box.innerHTML=`<span id="tile-answer-ph" style="display:none"></span>${t}${interim?'<span style="color:var(--text2)">…</span>':''}`;
}

// ══ NORMALISATION ══
async function normaliserChamp(texte) {
  const q = QUESTIONS[state.step]; if(!q) return;
  showNorm('processing','IA en cours...');
  const PROMPTS = {
    nom_client:`Normalise ce nom de client pour un rapport télécom : "${texte}"`,
    numero_affaire:`Normalise au format YYYY-NNN. Date : ${new Date().toLocaleDateString('fr-FR')}. Texte : "${texte}"`,
    date_debut:`Format JJ/MM/AAAA. Date du jour : ${new Date().toLocaleDateString('fr-FR')}. Texte : "${texte}"`,
    date_fin:`Format JJ/MM/AAAA. Date du jour : ${new Date().toLocaleDateString('fr-FR')}. Texte : "${texte}"`,
    heure_debut:`Format HH:MM 24h : "${texte}"`,
    heure_fin:`Format HH:MM 24h : "${texte}"`,
    redacteur:`Format "Prénom NOM" : "${texte}"`,
    techniciens_presents:`Liste "Prénom NOM" séparés virgules : "${texte}"`,
    clients_presents:`Normalise. Si rien → "Aucun" : "${texte}"`,
    type_intervention:`Parmi : Installation / Maintenance préventive / Maintenance curative / Mise en service / Raccordement fibre / Dépannage SAV / Audit / Tirage câble / Soudure fibre / Mesure OTDR / Programmation / Autre. Texte : "${texte}"`,
    designation_precise:`Reformule pro, sans hésitations : "${texte}"`,
    raison_intervention:`Reformule raison intervention, concis : "${texte}"`,
    // FIX #6 : normalisation chantier_termine renvoie "oui" ou "non" minuscule
    // pour que le skip step 13→14 fonctionne avec .trim().toLowerCase()
    chantier_termine:`Réponds UNIQUEMENT "oui" ou "non" en minuscules : "${texte}"`,
    si_non_details:`Reformule actions restantes : "${texte}"`,
    difficultes:`Reformule. Si rien → "Aucune" : "${texte}"`,
    points_attention:`Reformule. Si rien → "Aucun" : "${texte}"`
  };
  try {
    const resp = await fetch(CONFIG.NORMALIZE_URL, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        prompt: PROMPTS[q.key]||`Normalise : "${texte}"`,
        field_key: q.key,
        raw_text: texte,
        sender_email: state.user?.email||''
      })
    });
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const data = await resp.json();
    const normalized = data.normalized||texte;
    const confidence = data.confidence||1;
    const review = data.needs_review||false;
    state.transcript = normalized;
    setTileAnswer(normalized,false);
    setOrbTranscript(normalized,false);
    showNorm(
      review||confidence<0.7?'review':'done',
      review||confidence<0.7?`Confiance ${Math.round(confidence*100)}% — vérifier`:`✓ ${Math.round(confidence*100)}%`
    );
    demanderConfirmation('valider');
  } catch(e) {
    clearNorm();
    demanderConfirmation('valider');
  }
}
function showNorm(type,text) {
  const badge=`<div class="norm-badge ${type}">${text}</div>`;
  document.getElementById('tile-norm').innerHTML=badge;
  document.getElementById('orb-norm').innerHTML=badge;
}
function clearNorm() {
  document.getElementById('tile-norm').innerHTML='';
  document.getElementById('orb-norm').innerHTML='';
}

// ══ TTS ══
function speak(text,onEnd) {
  if(!state.synth){ if(onEnd) onEnd(); return; }
  state.synth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang='fr-FR'; utt.rate=.95; utt.pitch=1;
  const voices=state.synth.getVoices();
  const fr=voices.find(v=>v.lang.startsWith('fr')&&!v.name.includes('Google'))||voices.find(v=>v.lang.startsWith('fr'));
  if(fr) utt.voice=fr;
  state.isSpeaking=true; setOrbState('speaking');
  utt.onend=utt.onerror=()=>{ state.isSpeaking=false; setOrbState('idle'); if(onEnd) onEnd(); };
  state.synth.speak(utt);
}

// ══ CONFIRMATION ══
function normalizeCmd(t) {
  t=t.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/^valider?$|^oui$|^confirmer?$/.test(t)) return 'valider';
  if(/^passer?$|^ignorer?$|^suivant$|^skip$/.test(t)) return 'passer';
  if(/^reprendre?$|^recommencer?$|^effacer?$|^non$/.test(t)) return 'reprendre';
  return null;
}
function demanderConfirmation(action) {
  state.awaitingConfirmation=true; state.pendingAction=action;
  const msg=action==='valider'&&state.transcript
    ? `J'ai noté : ${state.transcript}. Valider, reprendre ou passer ?`
    : 'Passer ce champ ? Valider ou reprendre.';
  document.getElementById('orb-valid').style.display='flex';
  document.getElementById('orb-reprendre').style.display='flex';
  speak(msg,()=>setTimeout(()=>startListening(),300));
}
function confirmerAction() {
  state.awaitingConfirmation=false;
  const action=state.pendingAction; state.pendingAction=null;
  document.getElementById('orb-valid').style.display='none';
  document.getElementById('orb-reprendre').style.display='none';
  clearNorm(); stopListening(); closeOrb();
  if(action==='valider') validerReponse();
  else if(action==='passer') passerQuestion();
}
function annulerConfirmation() {
  state.awaitingConfirmation=false; state.pendingAction=null;
  document.getElementById('orb-valid').style.display='none';
  document.getElementById('orb-reprendre').style.display='none';
  clearNorm(); reprendreChamp();
}
function validerReponse() {
  const rep=state.transcript.trim();
  if(!rep){ showToast('Aucune réponse — dis "passer"'); openOrb(); return; }
  state.responses[QUESTIONS[state.step].key]=rep;
  state.transcript=''; state.step++;
  if(state.step>=QUESTIONS.length) state.inPhotoMode=true;
  setTimeout(()=>renderStep(),100);
}
function passerQuestion() {
  state.responses[QUESTIONS[state.step].key]='';
  state.transcript=''; state.step++;
  if(state.step>=QUESTIONS.length) state.inPhotoMode=true;
  setTimeout(()=>renderStep(),100);
}
function reprendreChamp() {
  state.transcript='';
  document.getElementById('tile-answer-box').innerHTML=`<span class="tile-answer-placeholder" id="tile-answer-ph">Appuie sur le micro pour répondre...</span>`;
  document.getElementById('orb-text').innerHTML='<span class="ph">Enregistrement effacé. Réessaie.</span>';
  speak('Enregistrement effacé. Réponds.',()=>setTimeout(()=>startListening(),300));
}
function skipQuestion() {
  stopListening(); state.awaitingConfirmation=false; state.pendingAction=null;
  demanderConfirmation('passer');
}

// ══ PHOTOS — compression Canvas ══
async function compressImage(file){
  return new Promise(resolve=>{
    const MAX=1200, QUALITY=0.82;
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      let w=img.width, h=img.height;
      if(w<=MAX&&h<=MAX){ resolve(file); return; }
      if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}
      const canvas=document.createElement('canvas');
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      canvas.toBlob(blob=>{
        if(!blob){ resolve(file); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/,'.jpg'), {type:'image/jpeg',lastModified:Date.now()}));
      },'image/jpeg',QUALITY);
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); resolve(file); };
    img.src=url;
  });
}

async function handlePhotos(input) {
  const files=Array.from(input.files).slice(0,5-state.photoFiles.length);
  input.value='';
  if(!files.length) return;
  showToast('Compression…');
  for(const file of files){
    if(state.photoFiles.length>=5) break;
    const c=await compressImage(file);
    state.photoFiles.push(c);
    const url=URL.createObjectURL(c);
    state.photos.push(url);
    addPhotoThumb(url,state.photos.length-1);
  }
  updatePhotoUI();
  const ko=Math.round(state.photoFiles.reduce((s,f)=>s+f.size,0)/1024);
  showToast(`${state.photoFiles.length} photo${state.photoFiles.length>1?'s':''} · ${ko} ko`);
}

function addPhotoThumb(url,i) {
  const el=document.createElement('div'); el.className='photo-thumb'; el.id='pthumb-'+i;
  el.innerHTML=`<img src="${url}"><div class="rm-ph" onclick="removePhoto(${i})">✕</div>`;
  document.getElementById('photos-grid').insertBefore(el,document.getElementById('photo-add-btn'));
}
function removePhoto(i) {
  state.photos.splice(i,1); state.photoFiles.splice(i,1);
  document.querySelectorAll('.photo-thumb').forEach(el=>el.remove());
  state.photos.forEach((url,idx)=>addPhotoThumb(url,idx));
  updatePhotoUI();
}
function updatePhotoUI() {
  const c=state.photoFiles.length;
  document.getElementById('photos-counter').textContent=`${c} / 5`;
  for(let i=0;i<5;i++){ const d=document.getElementById('pdot-'+i); if(d) d.className='photo-dot'+(i<c?' filled':''); }
  const b=document.getElementById('photo-add-btn'); if(b) b.style.display=c>=5?'none':'';
  if(c>=5) showToast('Maximum 5 photos atteint');
}

// ══ ENVOI ══
async function terminerPhotos() {
  ['lstep-1','lstep-2','lstep-3'].forEach((id,i)=>document.getElementById(id).className='loading-step'+(i===0?' active':''));
  document.getElementById('loading').classList.add('visible');
  setTimeout(()=>{ document.getElementById('lstep-1').className='loading-step done'; document.getElementById('lstep-2').className='loading-step active'; },700);
  setTimeout(()=>{ document.getElementById('lstep-2').className='loading-step done'; document.getElementById('lstep-3').className='loading-step active'; },1800);
  try{ await envoyerRapport(); }
  catch(e){ hideLoading(); showToast('Erreur : '+e.message); }
}

async function envoyerRapport() {
  const fd=new FormData();
  fd.append('data', JSON.stringify({
    senderEmail: state.user.email,
    senderName:  state.user.name,
    source:      'pwa-v8',
    responses:   state.responses
  }));
  state.photoFiles.forEach((f,i)=>fd.append(`photo_${i+1}`,f,f.name));
  const resp=await fetch(CONFIG.PWA_URL,{method:'POST',body:fd});
  if(!resp.ok) throw new Error('HTTP '+resp.status);
  hideLoading();
  afficherConfirmation();
}

function afficherConfirmation() {
  const r=state.responses;
  document.getElementById('confirm-recap').innerHTML=
    `<strong>👷 ${state.user.name}</strong><br>` +
    `Client : <strong>${r.nom_client||'—'}</strong><br>` +
    `Affaire : <strong>${r.numero_affaire||'—'}</strong><br>` +
    `Date : <strong>${r.date_debut||'—'}</strong> → <strong>${r.date_fin||'—'}</strong><br>` +
    `Horaires : ${r.heure_debut||'?'} → ${r.heure_fin||'?'}<br>` +
    `Type : <strong>${r.type_intervention||'—'}</strong><br>` +
    `Terminé : <strong>${r.chantier_termine||'—'}</strong><br>` +
    `Photos : <strong>${state.photoFiles.length}</strong>`;
  showScreen('confirmation');
  speak('Rapport enregistré avec succès. Merci '+state.user.name.split(' ')[0]);
}

function nouveauRapport() {
  state.step=0; state.responses={}; state.photos=[]; state.photoFiles=[]; state.inPhotoMode=false;
  document.querySelectorAll('.photo-thumb').forEach(el=>el.remove());
  const b=document.getElementById('photo-add-btn'); if(b) b.style.display='';
  document.getElementById('photos-counter').textContent='0 / 5';
  for(let i=0;i<5;i++){ const d=document.getElementById('pdot-'+i); if(d) d.className='photo-dot'; }
  document.getElementById('tile-answer-box').style.display='';
  document.getElementById('tile-photos-content').style.display='none';
  document.getElementById('bottom-bar').style.display='none';
  showScreen('rapport');
  renderStep();
}

function hideLoading(){ document.getElementById('loading').classList.remove('visible'); }
if(window.speechSynthesis) speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();
