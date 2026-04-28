/* ══════════════════════════════════════════════════════════════
   MODE ÉCRIT — panneau bottom-sheet
   ══════════════════════════════════════════════════════════════ */

.writing-panel {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
}
.writing-panel.open { pointer-events: all; }

.writing-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 10, .6);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity .35s cubic-bezier(.4, 0, .2, 1);
}
.writing-panel.open .writing-backdrop { opacity: 1; }

.writing-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--s1);
  border: 1px solid var(--border);
  border-radius: 22px 22px 0 0;
  padding: 0 0 env(safe-area-inset-bottom, 16px);
  transform: translateY(100%);
  transition: transform .38s cubic-bezier(.4, 0, .2, 1);
  max-height: 88dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.writing-panel.open .writing-sheet { transform: translateY(0); }

.writing-handle {
  width: 36px;
  height: 3px;
  border-radius: 3px;
  background: var(--border);
  margin: 14px auto 0;
  flex-shrink: 0;
}

.writing-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 10px 20px 0;
  flex-shrink: 0;
}
.wp-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--s3);
  transition: all .25s;
}
.wp-dot.done { background: var(--success); }
.wp-dot.active {
  background: var(--gold);
  width: 16px;
  border-radius: 3px;
}

.swipe-hint {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  color: var(--text3);
  text-align: center;
  padding: 4px 0 0;
  letter-spacing: .08em;
  opacity: .6;
  flex-shrink: 0;
}

.writing-cards-wrap {
  flex: 1;
  overflow: hidden;
  position: relative;
  touch-action: pan-y;
}
.writing-cards-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform .32s cubic-bezier(.4, 0, .2, 1);
  will-change: transform;
}
.writing-card {
  flex: 0 0 100%;
  width: 100%;
  padding: 20px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.wc-cat {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  color: var(--gold);
  letter-spacing: .14em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}
.wc-cat::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--gold);
  flex-shrink: 0;
}

.wc-q {
  font-family: 'Syne', sans-serif;
  font-size: clamp(1.1rem, 4.5vw, 1.45rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -.01em;
}

.wc-hint {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text2);
  font-style: italic;
  min-height: 14px;
}

.wc-input {
  width: 100%;
  padding: 14px 16px;
  background: var(--s2);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  font-size: 16px;
  color: var(--text);
  outline: none;
  font-family: 'Inter', sans-serif;
  transition: border-color .2s;
  -webkit-appearance: none;
}
.wc-input:focus { border-color: rgba(232, 169, 0, .5); }
.wc-input::placeholder { color: var(--text3); }
.wc-input[type="date"], .wc-input[type="time"] {
  color-scheme: dark;
  cursor: pointer;
}
.wc-input.filled {
  border-color: rgba(78, 203, 122, .35);
  background: rgba(78, 203, 122, .04);
}
.wc-textarea {
  resize: none;
  min-height: 100px;
}

.yesno-row {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.yesno-btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  border: 1.5px solid var(--border);
  background: var(--s2);
  color: var(--text);
  transition: all .2s;
}
.yesno-btn:active { transform: scale(.97); }
.yesno-btn.selected-oui {
  background: rgba(78, 203, 122, .15);
  border-color: rgba(78, 203, 122, .5);
  color: var(--success);
}
.yesno-btn.selected-non {
  background: rgba(224, 82, 82, .12);
  border-color: rgba(224, 82, 82, .4);
  color: var(--danger);
}

.tech-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.writing-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px 16px;
  flex-shrink: 0;
  border-top: 1px solid var(--border);
}
.wn-btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s;
}
.wn-btn:active { transform: scale(.97); }
.wn-prev {
  background: var(--s3);
  color: var(--text2);
  border: 1px solid var(--border);
}
.wn-next {
  background: var(--gold);
  color: #111;
}
.wn-next.last {
  background: var(--success);
  color: #fff;
}
.wn-skip {
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 10px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .2s;
}
.wn-skip:active {
  border-color: var(--gold);
  color: var(--gold);
}
.wn-skip svg { width: 14px; height: 14px; }
