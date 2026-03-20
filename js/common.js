// ══ CONFIG ══
const CONFIG = {
  GOOGLE_CLIENT_ID: '303849110460-10rqg6oco2jseasj4ccsh1n0e4btulea.apps.googleusercontent.com',
  N8N_BASE:         'https://n8n.talco-lr.com/webhook',
  VOICE_URL:        '/api/voice-chat',
  NORMALIZE_URL:    '/api/normalize',
  PWA_URL:          '/api/pwa',
  ALLOWED_DOMAIN:   'talco-lr.com'
};

// ══ LOGO ══
const LOGO_B64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCADIAMgDASIAAhEBAxEB/8QAHAABAAICAwEAAAAAAAAAAAAAAAcIBQYBAwQC/8QAGQEBAQEBAQEAAAAAAAAAAAAAAAECAwQF/9oADAMBAAIQAxAAAAG1IAAAAAAAAAAAAAAAAADBabEnon2A3h19lAAAAAAAADEHMKa1h83lwl5cDMS/BHNW9RVKtyFAAAAAAK7zRWGVkMfIsuFWTWVsWTFbFkxXGcM9pibmKAAAAAAjKEZt0jN0nZciNvagNzlKAZ+s+Illmv5s/gw/VLYkagAAAAAEdViuvTTN8bhLy4HsuvSe7Gp0UqupSSO/ddDn5ZlGsgAAAAAIYmfiKOpeiHOgPXdik92NTz0ku3T+Oy3eE2SwKAAAAAAHnPRHey+2K1abc31LSi1Gye00rZvT9J2Pnz16gAAAAAAMHnBVOdou3fNiKwNe5LMFNUK79UZZPPZaNH7fNsRI2e1vZNQAAAAAB8/Q0z73BHm0vffiIp3XNfHn6RxuXry5p3h396eYUAAAAAAAB1Y3J9Hyu/bjct86mLzHn9GgfR4gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/EACsQAAEDAwIDCAMBAAAAAAAAAAQCAwUAAQYVFwcwQBASExQWIDM0ESVgJP/aAAgBAQABBQL+VOnAI2nuIcY3dPEePvcTNIku7biXUdFJyo0QNI5Q7Mo0wW9aWJWliVpYlRytKcg8yHkHuglZNmICk1LnSNHarR2q0dqtHarR2q0dqtIarFsi77nPyozX5DRk0Fizsi7t3J1t3J1t3J1t3J1t3J1t3J03w/lmnIWQvIg82fP0yH8iBevIR9YKKKzMe9H+DJ+bny06ZpsfWmx9QJAUCZ64Yr1wxTeasLcpd+6j1uivW6KXkiJCV5ubR6pO22xlbbGVtsZW2xlbbGUzw6LbepxPfb22MrbYyrYcRCHc3PRfMY/7RPtU/wDB4zleM5WGsrMyHmljJMFMFWCV7BPtUR8HZw6i7tDc7Psfu8n2Cfaoj4KhIh2bPGGbDH517fm2V4YsNXaJ9qiPgiogmZJgoNiCE6GbwkKVufhUoDd4Z4e41/wR6j8ergycrQQLEcx0D5DQrXqCMoWTENU8YOMq17LTYofxqcebZshxLqVKsmzJTJHPmYpE0C/BNJyiExkXHFTTr087ipHmsexf9jmkvIWio2ChnsxLCjjMZyqdJIyfJcjxZvHQoKQvKRHOxj9lmuey/ko3VSW4HDJHwcW4fEChryx1qSxnh+eKzECZW5I5DjykR2a8QJZlQOOAqjoTmqt3kweLDQDxWMDmTBLCShg8OGBC23j6hoEeFCJ4dx7zsNAiQbM1ioU4uJwoCKf6JSrISO/5hD5bQ99Ta6VxxLSbvIJu3ZLaS3O4tu1ikdIttLlliMuVZNrUlFk38BFnf5X/xAAhEQACAQMDBQAAAAAAAAAAAAABAgASMDEDESEQMkBQYP/aAAgBAwEBPwH4QdTBcMFvfy6Hqo25jo6dwt6bIucxHCtUeZqMGx6D/8QAKhEAAQMCBAILAAAAAAAAAAAAAQIDBAAREjAxgRNRECEiIzJAUGBxwfD/2gAIAQIBAT8B9iHpFHMFHLt5okJFzRkspa46lWTzNMSWJIuyoHLmMyXuy3hw8jfr3FSIy3meCg4fr9tUNhTCO88W+2unxp6B/8QAQxAAAQIDAggKCQEHBQAAAAAAAQIDAAQREjETISIyNUFR0QUQMDRScZGSodIUIEBhcoGTosEjFSRCQ2Bi8DNEc4Ph/9oACAEBAAY/Av6VpMzTbaujWquyMlL7vvSjeYxy8yPknfFPScCrY6LPjdAWhQWk3FJqPYy9MuWE6hrV1QQjhFngxk/y6Lt/MhMaXlu455Y0tLdxzyxpaW7jnljS0t3HPLFuV4dYb2psOUPysx6K+pCJi5K0VsOdVfYVzL5yU3DWo7I9JmOFJRBOa0Sv9MbM2NKyX3+WNKyX3+WNKyX3+WNKyX3+WNKyX3+WNKyX3+WNKyXa55YTwbNTLcy7T9J9BOV7jXX7AttM5LsS8sqwlLqiLR1m6NJSXfVugty05JvLAtWUrN3ZGfL987oz5fvndGfL987oz5fvndGfL987oz5fvndCVodl0rSaghZxeEBTgszCCW3k7Fi/lpqYGJSUUT1nEIx8KJr/AMCo0on6CocLM6JhWBOTgynWNvILTc1PNW/+xN/hy0uyt3AodeFpZFaChjS7f0HN0aXb+g5uhUwjhJl0lFiimXN3ujnUt9N3dHOpb6bu6Ep9Kl8Zp/pubuInYI57KfRdjnsp9F2OC6TDDi0zAFGm1pNFYtfLcHS6FBBceKbSrro50x4xzpjxjnTHjHOmPGOdMeMIX6UxkkHXxKTtFI50x4xzpjxjg99x9twGabTRNdvLLUL2VpX+Pz6zPxjic+Exnq7Yz1dsStSVJbq4fkOWdYXmOJKTDsu4KLbVZPqs/GOJz4TxvTyxjdyEdWv/AD3cv+0mE1UkUeA2bfVZ+McTnwniRLt4hetfRTDbLQsttiyBy9DjELm5FFuXvU0L0f8AnqM/GOJz4TAZlkV6SjcnrjBNZSzjW4b1H2JTrX7pMH+JAyT1iDRn0lHSZx+F8UdaW2f700ho7FAxSTkJubOpWDsI7VR++PiSlz/IlTlHrXugMyzSWmxqHsJcecS02L1LNBGkJb6ogpl5lp9QxkNrBgB19tonUtYEAg1B1iMCHmsL0LQtdnFVxaUD+40i0hQUNoMVJoBrMHBPIcp0FV5cyrjim0EgkohPBbTi1N20pKzfdjh95Dy1Wk4y5TEIneFP9u2tLaa7NX+e+JFWxFjsxfiJqZvCcI4O2n5iYmiK4NOIbTqh+anpheDSaVF5OwbIbZlw89JrUkKVZNKHb1QOC2nCiWbXZ92LOMNz0g+8l1tYBJV4xLTSs5acrruPLvzN4SXHPx+YEo2f1pnEadHXC+DPQwlkm0pyybVa1rE8a45YrUO7WJx2YmGmCQlKcIsJrfX8RNqlXkPhFknBKtaxDjS3223cKVFK1U1CDIyrKHZZN79dWs9sTaJlQbJLiQVbaw3JNOJcdWu0oJNaARKMLFFhNVDYTj/PLEVpXWIccZcdcUtNn9SkI4RecdW4illvFZFIdZXmOJKD84nJVD7+DmQAqpFRTZijnEz2p3Q5KtlTra1FSsLj1UgqbdeZSf4AQRBRLJNVZzisalRhHQpt67CN3nrgPZcw6nNLtw+XsZJugqslIrTHFFHK2CMYWkdIpxey2lmyPfBo6EgXb4ShJ1YoNhvKplLF4izhRY6CRT2XKSFdcZTaYuGyFEDGq+MIE0Xt/pb/xAAqEAEAAQIDBwQDAQEAAAAAAAABEQAhMUFREGFxgZHw8TBAsdEgocFg4f/aAAgBAQABPyH/ACr6AeIS0mN3gP0VCCdRqjLxm+xxq7jqUOfswCDYLtoM2m5gl6zf3QaXKoub+DLly645ZBePZauN+wOWCO59jC4sDwA31EvOAeBRxrytfla/K1+Vr8rX5WuOgxo2aQO6DDhf59eRcnCJ64ctm2TqVJ4Ces/Ny5cuXLkEiDtRg05U+1v25+s7q6PcXSgkymN3ZTAmemMY8+gMTgA5PUzp6yCgJAAmBdvG0wYdueEF0Z2jVqOlSgbHdsJGWu1/5Xa/8pNNTAgu5iLnrF9oYBm/yvDfWvDfWvDfWvDfWvDfWn0gqBleGxzrLU8N9a8N9aCdXvpZ5m59ZBU8i4qy61LrUutS61LrSe5x2d00rzWvNaBnqUzEkftPWPeeDSRUtpuRn+PaddnbNNsQ1L+lu5vrsFpiunDlwd0afj2nXZ2zTYZ6uAtnNRBZ0QeuDAJZHOkJJbZ3pr8Pw7Trs7ZpTwXuR6qheU2/4jQ9lmEBkL23Ip4jMF7nKtyDk+VTZMKQTaacRDwK+KMjHiYejfxWTIRx3rm732MSyYUJYLtdj/2g+zJENbUYapEKc6OMaRJEo+MMR+42GkrBP5UUR9UUjNfKQFLBPEDDp68IiaJteL1bgOi1D036VYRe2BXyKKMh3kcw/Uu+l8ZZXO1a1DNzD+qY9aJmWHVKv7uOSL3LA4ZlAisjO3hIlZ7qVEBhmxJnEIf9oNiipvkgM/miUDDsIr+wfX0sPwWPxrqkAD/WHWi9kVwRuMg4VNvQFY/c0Y+icF2Jo7rkiCGcN16DwiCkYG+VqddDAsJwNBypURTwKmX3nzRjhaCSYzVOlXuzjMKOXrL7okzCp5xklBM2gKTyLR0QiJxvjjU6VmcYEPzTUyviR1J2BbAKQJkIsFoKQokwhwkmsxSrzD/CihuXYBpIhq/MpQS6gMePs3TgY0ZITOuKE34kKWo0mftQXhHOg7Yibi0KZaxN01q1pdrkKvXxhwzRm/tQwQMgZvRN1yilxCQhBlpUPRJWtEZIIhaf8t//2gAMAwEAAgADAAAAEPPPPPPPPPPPPPPPPPPP+9PPPPPPPPPD7z+P/PPPPPPIPPPPD/PPPPPPH7T108/PPPPPPE//AN08zzzzzzzyvf8A97v88888884jgEW48888888sTXQ/7U888888svP1ZP8APPPPPPPPOx7vPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP/xAAmEQACAQMCBAcAAAAAAAAAAAABEQAhMDEQQSBAUWFQcYGRscHw/9oACAEDAQE/EOSURtgakOGlgaMxmMxuwMRiUhW0C3lLoOLAKjfAEuzjQS7Z6QikOYZ2suAElCOICIbCvxErg47QJv3BU9Dn3hYA/Yvf8aw6K10KzvjPnnwD/8QAIBEBAAICAgIDAQAAAAAAAAAAAQARITEwQRBRIEBQkf/aAAgBAgEBPxD6VyzjXyNQb4HxRKJRKrgdymZhfcb6meUG+BLlV8AK4cPgFcZ7huGpidXw1GD0GVeiFgrmyjOt1vr3HQ03TdXr+1j3K4kRF3ou3ZgMJQtm+oNKSgQtAUUJvqxQaRzHhV0sUIejXZwUdb/A/8QAKBABAAEDAwMEAwEBAQAAAAAAAREAITFBUWEQcYEwQJHwIKHBYLHR/9oACAEBAAE/EP8AK31LJheP9NRxjCv8j9UUUdgeIUTtBDHeCPNC9fBA7gUfZ7T4GG2b+gyoXoaNE4rEQTwoYZpmzSpK7v4JEiQaQo4ATLuJJolFhgtJaLZtuXRVj2MW1yZJx9U/AK2GhAqqpFwEoahZRZfzTp06dOnFCClxKJiKw1hlo6JFsaqT7ACQqMEISaTarhJl6bXDkgEFLjaQ8/nu3bt27c2sYxUg4og0fQ5bTII0Gx4PrTC22DCeFeGhxhSLJ1vF6+1/ymu1L8qxIYQIzfj0PGM7KQGkk7vrH0Z13ym7CHXDhczjJi7jOw89dGgkmQNVQgWGuvQ0gQIoQTKF/jqIEEe+gEtFgIL42fWnwJpLJMC3mefyEiRIkTJqaAQFDx6MMAy4FE/vUSJE7JNkSsEA3rNntDm5+Ik9q5nzXM+a5nzXM+a5nzWUve49GjDCf9lfTP7X0z+0OQRcXDDxfPrWPQcuKSckyclRYt8WVRDhIR1E/H6bb0+j39WUTELs4OBDu/XHtHm1kj1T8hhfj9Nt6fR7+i0CL4BJedA1UKI+Leigl1dV1VfXPyKFIHImpShrV2qRzwl+y51+m29Po99TtGMpXxTMGWLDR92ogAZ4JTQFyqvsZUEobcJAl3FeWaDjqlJ3xLsjmkZkwtzwCiFKdJAKsF221DvRCZ5tPlSg9Q0zpBGyAI5q/wBTL5bi6bi+xxl2c5IgEqHdOnK4yLF4SEwShPNX07NAiQQpI3o0HzCRIiWRNaWiTK+AlIN0XxjozfIEF4UVZhsGbyWofcQgG6uKyNuj7pMevftKEzhYSJh8UzI2vkYgiQktyoiyBwytEINWdqIQgxwIbIAP+tTrG94bx4FPxziQn64oEEt6BQx2SPDUQTMaEjIcKGgC6kavTC0lepcLSsKUr1DWxWWhIRYsRCqWhyYiYLESAmEW17OggwlANBcHPrrWceQZ8JB2plcVJXY/anMdtDqMi0JhnAxMPNWLiCcMfKaze7UQQBKSYULDbkEVaCKQ6FCCrR1iIm4SajSvincDgC4brDK1oeMmiZ5WI2N4GtC4b6xMJGIIbLilWN5pN+Ujx6zkKF1EiSdSirAcw+4yEzOCode11eWFfHJOlqXcJkbrFM3hU3bZ4EpgAQhkbdDGR29JpAMGyatPeUuIrYHdaRIcQ4GAAAJYAL4lWj0jgUYBAN4mLTFQYENIsCCGjKG5D7OKL5X3LxRG4SEyQtuZPFKvugsb2x5oUPESod0mKGT2kTXhaCXBRdNYQVNCmJg5l2qDhngQIGzN0l5pSC5FXUMXwN//ACrbGXacZEwcMRO9AAAQGntCHfIgGGHW7UM5MK+SKAElAEGBxxUOJZ6qADPAWxR+SDlgYmQsts5/y3//2Q==";

// ══ SESSION PERSISTANTE 7 JOURS ══
const SESSION_KEY = 'talco_user_session';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

function saveUserSession(user){
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, expires: Date.now() + SESSION_TTL }));
}
function loadUserSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    const data = JSON.parse(raw);
    if(Date.now() > data.expires){ localStorage.removeItem(SESSION_KEY); return null; }
    return data.user;
  }catch(e){ return null; }
}
function clearUserSession(){
  localStorage.removeItem(SESSION_KEY);
}

// ══ AUTH GOOGLE ══
function handleGoogleCredential(r){
  try{
    const p = JSON.parse(atob(r.credential.split('.')[1]));
    const email = p.email||'', name = p.name||email.split('@')[0];
    if(!email.endsWith('@'+CONFIG.ALLOWED_DOMAIN)){
      document.getElementById('login-error').style.display='block';
      if(window.google) google.accounts.id.prompt();
      return;
    }
    document.getElementById('login-error').style.display='none';
    const initials = name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
    const user = {email, name, initials, picture:p.picture||null};
    saveUserSession(user);
    onUserAuthenticated(user);
  }catch(e){ showToast('Erreur de connexion'); }
}

function loginFallback(){
  const email = prompt('Email (hors-ligne):', 'prenom.nom@talco-lr.com');
  if(!email||!email.endsWith('@'+CONFIG.ALLOWED_DOMAIN)){
    document.getElementById('login-error').style.display='block'; return;
  }
  document.getElementById('login-error').style.display='none';
  const name = email.split('@')[0].split('.').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ');
  const user = {email, name, initials:name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()};
  saveUserSession(user);
  onUserAuthenticated(user);
}

function initAuth(){
  setTimeout(()=>{ if(!window.google) document.getElementById('btn-fallback').style.display='flex'; }, 4000);
  const saved = loadUserSession();
  if(saved) onUserAuthenticated(saved);
}

// ══ LOGO INJECTION ══
function injectLogos(){
  const src = 'data:image/jpeg;base64,' + LOGO_B64;
  document.querySelectorAll('.logo-img').forEach(i => i.src = src);
}

// ══ UTILS ══
function showScreen(n){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+n).classList.add('active');
}
function showToast(msg, d=3000){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('visible');
  setTimeout(()=>t.classList.remove('visible'), d);
}
function escHtml(t){
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
