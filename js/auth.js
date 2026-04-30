// ══════════════════════════════════════════════════════════════
// AUTH GOOGLE + SESSION PERSISTANTE 7 JOURS
// ══════════════════════════════════════════════════════════════

function saveUserSession(user) {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
      user,
      expires: Date.now() + SESSION_TTL
    }));
  } catch (e) {
    console.warn('localStorage indisponible, session non sauvegardée:', e);
  }
}

function loadUserSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() > data.expires) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return null;
    }
    return data.user;
  } catch (e) {
    return null;
  }
}

function clearUserSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (e) {
    console.warn('localStorage indisponible:', e);
  }
}

// Callback Google Identity Services (déclaré globalement pour <div data-callback>)
window.handleGoogleCredential = function(response) {
  try {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const email = payload.email || '';
    const name = payload.name || email.split('@')[0];

    // Vérifier que le token n'est pas expiré (tolérance 5 min pour le décalage horaire)
    if (payload.exp && (payload.exp * 1000) < (Date.now() - 5 * 60 * 1000)) {
      showToast('Token expiré — reconnecte-toi');
      return;
    }

    if (!email.endsWith('@' + CONFIG.ALLOWED_DOMAIN)) {
      const err = document.getElementById('login-error');
      if (err) err.style.display = 'block';
      return;
    }

    const errEl = document.getElementById('login-error');
    if (errEl) errEl.style.display = 'none';

    const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
    const user = { email, name, initials, picture: payload.picture || null };

    // Stocker le JWT brut en mémoire uniquement (pas localStorage)
    // → transmis à n8n pour vérification cryptographique côté serveur
    state.idToken = response.credential;

    saveUserSession(user);
    onUserAuthenticated(user);
  } catch (e) {
    console.error('Erreur Google Auth:', e);
    showToast('Erreur connexion');
  }
};

// Fallback manuel (si Google ne charge pas)
window.loginFallback = function() {
  const email = prompt('Email:', 'prenom.nom@talco-lr.com');
  if (!email || !email.endsWith('@' + CONFIG.ALLOWED_DOMAIN)) {
    const err = document.getElementById('login-error');
    if (err) err.style.display = 'block';
    return;
  }
  const errEl = document.getElementById('login-error');
  if (errEl) errEl.style.display = 'none';

  const name = email.split('@')[0]
    .split('.')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
  const user = {
    email,
    name,
    initials: name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
  };
  saveUserSession(user);
  onUserAuthenticated(user);
};

// Affichage du bouton fallback si Google n'a pas chargé après 4s
function setupAuthFallback() {
  setTimeout(() => {
    if (!window.google) {
      const btn = document.getElementById('btn-fallback');
      if (btn) btn.style.display = 'flex';
    }
  }, 4000);
}

// Appelé après authentification réussie (déclaré dans app.js)
// onUserAuthenticated(user)
