(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  const CONTACT_ENDPOINT = 'https://aria-booking-server-production.up.railway.app/contact';
  const BRAND = { bg: '#1a1a1a', gold: '#C9A84C', goldDark: '#a8872f', white: '#ffffff', muted: '#888' };

  // ── Conversation state ───────────────────────────────────────────────────────
  const STATE = {
    step: 0,
    name: '',
    email: '',
    business: '',
    missedCalls: '',
  };

  // ── Conversation script ──────────────────────────────────────────────────────
  // Each step:  { message, type: 'text'|'yesno'|'input', inputLabel?, inputKey?, nextYes?, nextNo? }
  const STEPS = [
    {
      // 0 – opener
      message: "Hi! 👋 I'm Max, Omnidesq's AI assistant. Are you a business owner looking to stop missing calls?",
      type: 'yesno',
      nextYes: 1,
      nextNo: 'not-owner',
    },
    {
      // 1 – business type
      message: "Great! What type of business do you run?",
      type: 'input',
      inputLabel: 'e.g. dental office, law firm, salon…',
      inputKey: 'business',
      next: 2,
    },
    {
      // 2 – missed calls
      message: "How many calls do you miss per week on average?",
      type: 'input',
      inputLabel: 'e.g. 10–20 per week',
      inputKey: 'missedCalls',
      next: 3,
    },
    {
      // 3 – demo pitch
      message: "You're leaving money on the table! 💰\n\nWant to hear our AI receptionist right now? Call <strong>+1 (414) 815-9423</strong> — or I can set up a quick demo with Abner.\n\nLeave your name and email and we'll reach out ASAP:",
      type: 'contact',
      next: 4,
    },
    {
      // 4 – done
      message: "You're all set! ✅ Abner will be in touch soon. Talk soon! 🚀",
      type: 'done',
    },
  ];

  const NOT_OWNER_MSG = "No worries! If you ever know a business owner who's tired of missing calls, send them our way. Have a great day! 😊";

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'class') e.className = v;
      else e.setAttribute(k, v);
    });
    children.forEach(c => {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function css(styles) {
    const s = document.createElement('style');
    s.textContent = styles;
    document.head.appendChild(s);
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
  css(`
    #oc-chat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99998;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${BRAND.gold};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .2s ease, background .2s ease;
    }
    #oc-chat-fab:hover { background: ${BRAND.goldDark}; transform: scale(1.08); }
    #oc-chat-fab svg { width: 28px; height: 28px; fill: ${BRAND.bg}; }

    #oc-chat-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid #fff;
      animation: oc-pulse 2s infinite;
    }
    @keyframes oc-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: .7; }
    }

    #oc-chat-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      z-index: 99999;
      width: 360px;
      max-width: calc(100vw - 32px);
      border-radius: 16px;
      background: ${BRAND.bg};
      box-shadow: 0 8px 40px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(.9) translateY(10px);
      opacity: 0;
      pointer-events: none;
      transition: transform .25s ease, opacity .25s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #oc-chat-window.oc-open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    #oc-chat-header {
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2218 100%);
      border-bottom: 2px solid ${BRAND.gold};
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #oc-chat-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: ${BRAND.gold};
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    #oc-chat-header-text { flex: 1; }
    #oc-chat-header-name { color: ${BRAND.white}; font-weight: 700; font-size: 15px; margin: 0; }
    #oc-chat-header-sub  { color: ${BRAND.gold}; font-size: 11px; margin: 0; }
    #oc-chat-close {
      background: none; border: none; cursor: pointer;
      color: ${BRAND.muted}; font-size: 20px; line-height: 1; padding: 2px 6px;
      transition: color .15s;
    }
    #oc-chat-close:hover { color: ${BRAND.white}; }

    #oc-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 340px;
      scroll-behavior: smooth;
    }
    #oc-chat-messages::-webkit-scrollbar { width: 4px; }
    #oc-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #oc-chat-messages::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }

    .oc-msg {
      max-width: 85%;
      padding: 10px 13px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.5;
      word-break: break-word;
    }
    .oc-msg-bot {
      background: #252525;
      color: ${BRAND.white};
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }
    .oc-msg-bot strong { color: ${BRAND.gold}; }
    .oc-msg-user {
      background: ${BRAND.gold};
      color: ${BRAND.bg};
      border-bottom-right-radius: 4px;
      align-self: flex-end;
      font-weight: 600;
    }

    #oc-chat-footer {
      border-top: 1px solid #2a2a2a;
      padding: 10px 12px;
    }

    .oc-yesno { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .oc-btn {
      padding: 9px 18px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: background .2s, transform .1s;
    }
    .oc-btn:active { transform: scale(.97); }
    .oc-btn-primary { background: ${BRAND.gold}; color: ${BRAND.bg}; }
    .oc-btn-primary:hover { background: ${BRAND.goldDark}; }
    .oc-btn-secondary { background: #2e2e2e; color: ${BRAND.white}; border: 1px solid #444; }
    .oc-btn-secondary:hover { background: #3a3a3a; }

    .oc-input-row { display: flex; gap: 8px; }
    .oc-input {
      flex: 1;
      padding: 9px 12px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #252525;
      color: ${BRAND.white};
      font-size: 13px;
      outline: none;
      transition: border-color .2s;
    }
    .oc-input::placeholder { color: ${BRAND.muted}; }
    .oc-input:focus { border-color: ${BRAND.gold}; }

    .oc-contact-form { display: flex; flex-direction: column; gap: 8px; }
    .oc-input-full {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 12px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #252525;
      color: ${BRAND.white};
      font-size: 13px;
      outline: none;
      transition: border-color .2s;
    }
    .oc-input-full::placeholder { color: ${BRAND.muted}; }
    .oc-input-full:focus { border-color: ${BRAND.gold}; }
    .oc-error { color: #f87171; font-size: 12px; text-align: center; }
    .oc-submitting { opacity: .6; pointer-events: none; }

    .oc-typing {
      display: flex; align-items: center; gap: 5px;
      padding: 10px 13px;
      background: #252525;
      border-radius: 14px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
      width: 48px;
    }
    .oc-dot {
      width: 6px; height: 6px; border-radius: 50%; background: ${BRAND.gold};
      animation: oc-bounce .9s infinite;
    }
    .oc-dot:nth-child(2) { animation-delay: .15s; }
    .oc-dot:nth-child(3) { animation-delay: .3s; }
    @keyframes oc-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    @media (max-width: 420px) {
      #oc-chat-window { right: 8px; left: 8px; width: auto; bottom: 88px; }
      #oc-chat-fab   { bottom: 16px; right: 16px; }
    }
  `);

  // ── DOM build ────────────────────────────────────────────────────────────────
  const badge   = el('div', { id: 'oc-chat-badge' });
  const fab     = el('button', { id: 'oc-chat-fab', 'aria-label': 'Open chat' });
  fab.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
  </svg>`;
  fab.appendChild(badge);

  const header = el('div', { id: 'oc-chat-header' });
  header.innerHTML = `
    <div id="oc-chat-avatar">🤖</div>
    <div id="oc-chat-header-text">
      <p id="oc-chat-header-name">Max</p>
      <p id="oc-chat-header-sub">Omnidesq AI Assistant · Online</p>
    </div>
  `;
  const closeBtn = el('button', { id: 'oc-chat-close', 'aria-label': 'Close chat' }, '✕');
  header.appendChild(closeBtn);

  const messages = el('div', { id: 'oc-chat-messages' });
  const footer   = el('div', { id: 'oc-chat-footer' });

  const chatWindow = el('div', { id: 'oc-chat-window' }, header, messages, footer);

  document.body.appendChild(fab);
  document.body.appendChild(chatWindow);

  // ── Chat logic ───────────────────────────────────────────────────────────────
  let isOpen = false;
  let conversationDone = false;

  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle('oc-open', isOpen);
    if (isOpen) {
      badge.style.display = 'none';
      if (STATE.step === 0 && messages.children.length === 0) {
        showStep(0);
      }
    }
  }

  fab.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  function scrollBottom() {
    setTimeout(() => { messages.scrollTop = messages.scrollHeight; }, 50);
  }

  function addMessage(html, who) {
    const m = el('div', { class: `oc-msg oc-msg-${who}` });
    m.innerHTML = html.replace(/\n/g, '<br>');
    messages.appendChild(m);
    scrollBottom();
    return m;
  }

  function showTyping(cb, delay = 900) {
    const t = el('div', { class: 'oc-typing' });
    t.innerHTML = '<div class="oc-dot"></div><div class="oc-dot"></div><div class="oc-dot"></div>';
    messages.appendChild(t);
    scrollBottom();
    setTimeout(() => {
      t.remove();
      cb();
    }, delay);
  }

  function clearFooter() {
    footer.innerHTML = '';
  }

  // ── Step renderer ────────────────────────────────────────────────────────────
  function showStep(idx) {
    if (idx === 'not-owner') {
      clearFooter();
      showTyping(() => {
        addMessage(NOT_OWNER_MSG, 'bot');
        conversationDone = true;
      });
      return;
    }

    const step = STEPS[idx];
    if (!step) return;

    showTyping(() => {
      addMessage(step.message, 'bot');
      clearFooter();
      renderFooter(step, idx);
    }, idx === 0 ? 600 : 1000);
  }

  function renderFooter(step, idx) {
    if (step.type === 'yesno') {
      const row = el('div', { class: 'oc-yesno' });
      const yes = el('button', { class: 'oc-btn oc-btn-primary', onclick: () => {
        addMessage('Yes! 👍', 'user');
        clearFooter();
        showStep(step.nextYes);
      }}, 'Yes, definitely!');
      const no = el('button', { class: 'oc-btn oc-btn-secondary', onclick: () => {
        addMessage('Not right now', 'user');
        clearFooter();
        showStep(step.nextNo);
      }}, 'Not right now');
      row.appendChild(yes);
      row.appendChild(no);
      footer.appendChild(row);

    } else if (step.type === 'input') {
      const row  = el('div', { class: 'oc-input-row' });
      const inp  = el('input', { class: 'oc-input', type: 'text', placeholder: step.inputLabel });
      const send = el('button', { class: 'oc-btn oc-btn-primary' }, '→');

      function submit() {
        const val = inp.value.trim();
        if (!val) { inp.focus(); return; }
        STATE[step.inputKey] = val;
        addMessage(val, 'user');
        clearFooter();
        showStep(step.next);
      }

      send.addEventListener('click', submit);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
      row.appendChild(inp);
      row.appendChild(send);
      footer.appendChild(row);
      setTimeout(() => inp.focus(), 200);

    } else if (step.type === 'contact') {
      const form = el('div', { class: 'oc-contact-form' });
      const nameInp  = el('input', { class: 'oc-input-full', type: 'text',  placeholder: 'Your name' });
      const emailInp = el('input', { class: 'oc-input-full', type: 'email', placeholder: 'Your email' });
      const errDiv   = el('div',   { class: 'oc-error' });
      const submitBtn = el('button', { class: 'oc-btn oc-btn-primary', style: { width: '100%' } }, 'Book my demo →');

      submitBtn.addEventListener('click', async () => {
        const name  = nameInp.value.trim();
        const email = emailInp.value.trim();
        if (!name || !email) { errDiv.textContent = 'Please fill in both fields.'; return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errDiv.textContent = 'Enter a valid email.'; return; }

        STATE.name  = name;
        STATE.email = email;
        errDiv.textContent = '';
        form.classList.add('oc-submitting');
        submitBtn.textContent = 'Sending…';

        try {
          const payload = {
            name,
            email,
            business: STATE.business,
            message: `Chatbot lead — Business: ${STATE.business} | Missed calls/week: ${STATE.missedCalls}`,
          };
          const res = await fetch(CONTACT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            addMessage(`${name} / ${email}`, 'user');
            clearFooter();
            showStep(4);
          } else {
            throw new Error('Server error');
          }
        } catch {
          form.classList.remove('oc-submitting');
          submitBtn.textContent = 'Book my demo →';
          errDiv.textContent = 'Something went wrong — try emailing abner@omnidesq.com';
        }
      });

      form.appendChild(nameInp);
      form.appendChild(emailInp);
      form.appendChild(errDiv);
      form.appendChild(submitBtn);
      footer.appendChild(form);
      setTimeout(() => nameInp.focus(), 200);

    } else if (step.type === 'done') {
      conversationDone = true;
      const row = el('div', { class: 'oc-yesno' });
      const close = el('button', { class: 'oc-btn oc-btn-secondary', onclick: toggleChat }, 'Close chat');
      row.appendChild(close);
      footer.appendChild(row);
    }
  }

  // ── Auto-prompt after delay ──────────────────────────────────────────────────
  setTimeout(() => {
    if (!isOpen) {
      badge.style.display = 'block';
    }
  }, 4000);
})();
