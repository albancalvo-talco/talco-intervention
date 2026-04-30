// ══════════════════════════════════════════════════════════════
// CONFIG GLOBALE
// ══════════════════════════════════════════════════════════════

const CONFIG = {
  GOOGLE_CLIENT_ID: '303849110460-10rqg6oco2jseasj4ccsh1n0e4btulea.apps.googleusercontent.com',
  VOICE_URL: 'https://n8n.talco-lr.com/webhook/talco-voice-chat',
  ALLOWED_DOMAIN: 'talco-lr.com',
  TIMEOUT_MS: 60000,
  AUDIO_BASE_PATH: '/talco-intervention/audio'
};

// ══════════════════════════════════════════════════════════════
// LISTE DES TECHNICIENS (référence unique)
// ══════════════════════════════════════════════════════════════
const TECHNICIENS = [
  'Mathilde Clerc',
  'Yonis Peres',
  'Romain Desprez',
  'Franck Sturm',
  'Emillion Lemoine',
  'Jean François Cuesta'
];

// ══════════════════════════════════════════════════════════════
// QUESTIONS (ordre + métadonnées)
// La Q "redacteur" est marquée autoFromGoogle:true
// → elle sera pré-remplie depuis le compte Google si possible
// ══════════════════════════════════════════════════════════════
const QUESTIONS = [
  {key:'nom_client',          label:'Client',       text:"Nom du client ?",                       hint:"ex : Mairie de Montpellier",            cat:"identification",   type:'text'},
  {key:'numero_affaire',      label:'Affaire',      text:"Numéro d'affaire ?",                    hint:"ex : 2025-042",                         cat:"identification",   type:'number'},
  {key:'date_debut',          label:'Début',        text:"Date de début ?",                       hint:"",                                      cat:"dates & horaires", type:'date'},
  {key:'date_fin',            label:'Fin',          text:"Date de fin ?",                         hint:"",                                      cat:"dates & horaires", type:'date'},
  {key:'heure_debut',         label:'H.début',      text:"Heure de début ?",                      hint:"",                                      cat:"dates & horaires", type:'time'},
  {key:'heure_fin',           label:'H.fin',        text:"Heure de fin ?",                        hint:"",                                      cat:"dates & horaires", type:'time'},
  {key:'redacteur',           label:'Rédacteur',    text:"Qui rédige ce rapport ?",               hint:"Sélectionne ton nom",                   cat:"équipe",           type:'tech-single', autoFromGoogle:true},
  {key:'techniciens_presents',label:'Techniciens',  text:"Techniciens présents ?",                hint:"Sélectionne tous les présents",         cat:"équipe",           type:'tech-multi'},
  {key:'clients_presents',    label:'Clients site', text:"Clients présents sur site ?",           hint:"ou : Aucun",                            cat:"équipe",           type:'text'},
  {key:'type_intervention',   label:'Type',         text:"Type d'intervention ?",                 hint:"Installation / Maintenance / Dépannage…",cat:"intervention",    type:'text'},
  {key:'designation_precise', label:'Description',  text:"Décris ce qui a été fait.",             hint:"",                                      cat:"intervention",     type:'textarea'},
  {key:'raison_intervention', label:'Raison',       text:"Raison de l'intervention ?",            hint:"pourquoi cette intervention",           cat:"intervention",     type:'text'},
  {key:'chantier_termine',    label:'Terminé',      text:"Chantier terminé ?",                    hint:"",                                      cat:"bilan",            type:'yesno'},
  {key:'si_non_details',      label:'Reste à faire',text:"Qu'est-ce qu'il reste à faire ?",       hint:"matériel, accès, config…",              cat:"bilan",            type:'textarea'},
  {key:'difficultes',         label:'Difficultés',  text:"Difficultés rencontrées ?",             hint:"ou : Aucune",                           cat:"bilan",            type:'textarea'},
  {key:'points_attention',    label:'Pts attention',text:"Points d'attention pour le prochain ?", hint:"ou : Aucun",                            cat:"bilan",            type:'textarea'}
];

const FIELD_ORDER = QUESTIONS.map(q => q.key);

// ══════════════════════════════════════════════════════════════
// VOIX TTS (audios pré-enregistrés côté front)
// ══════════════════════════════════════════════════════════════
const VOICES = [
  {id:'alloy',   name:'Alloy',   desc:'Neutre · mixte équilibrée'},
  {id:'echo',    name:'Echo',    desc:'Masculine · ton professionnel'},
  {id:'fable',   name:'Fable',   desc:'Expressive · ton narratif'},
  {id:'onyx',    name:'Onyx',    desc:'Grave · idéale terrain'},
  {id:'nova',    name:'Nova',    desc:'Féminine · ton énergique'},
  {id:'shimmer', name:'Shimmer', desc:'Féminine · ton doux'}
];

// ══════════════════════════════════════════════════════════════
// CLÉS LOCALSTORAGE
// ══════════════════════════════════════════════════════════════
const STORAGE_KEYS = {
  SESSION: 'talco_user_session',
  VOICE: 'talco_voice'
};

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours

const DEBUG = false;
