/* Omnidesq website: menu, visit-source tracking and the contact form for the home pages (/, /es/). */
(function () {
  'use strict';

  // Leads go to the app (app.omnidesq.com). The old Railway server is only a second try while it still exists.
  var LEAD_ENDPOINTS = [
    'https://app.omnidesq.com/contact',
    'https://aria-booking-server-production.up.railway.app/contact'
  ];

  // Remember where the visitor came from (ads, campaigns) so the lead carries it.
  try {
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(function (k) {
      if (params.get(k)) utm[k] = params.get(k);
    });
    if (Object.keys(utm).length) sessionStorage.setItem('omnidesq_utm', JSON.stringify(utm));
  } catch (e) {}

  // Phone menu
  var menu = document.getElementById('menu');
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  document.querySelectorAll('[data-menu-open]').forEach(function (b) { b.addEventListener('click', function () { setMenu(true); }); });
  document.querySelectorAll('[data-menu-close], #menu a').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });

  // Send a lead: the app first, then the old server. Returns the server's reply, or throws when neither took it.
  async function sendLead(data) {
    var lastError;
    for (var i = 0; i < LEAD_ENDPOINTS.length; i++) {
      try {
        var res = await fetch(LEAD_ENDPOINTS[i], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        var result = await res.json();
        if (result && result.success) return result;
        // The server understood the form and said no (for example a missing field): do not ask the second server.
        if (res.status >= 400 && res.status < 500) return result;
        lastError = new Error('Lead not saved');
      } catch (err) { lastError = err; }
    }
    throw lastError || new Error('Lead not saved');
  }
  window.omnidesqSendLead = sendLead;

  var form = document.getElementById('lead-form');
  if (!form) return;
  var msg = document.getElementById('lead-msg');
  var btn = form.querySelector('button[type="submit"]');
  var text = {
    missing: form.getAttribute('data-missing'),
    sending: form.getAttribute('data-sending'),
    sent: form.getAttribute('data-sent'),
    thanks: form.getAttribute('data-thanks'),
    failed: form.getAttribute('data-failed')
  };
  var label = btn.textContent;

  function say(kind, words) {
    msg.className = 'form-msg ' + kind;
    msg.textContent = words;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var f = form.elements;
    var data = {
      name: f.name.value.trim(),
      business: f.business.value.trim(),
      email: f.email.value.trim(),
      businessType: f.businessType.value,
      message: f.message.value.trim()
    };
    if (f.location && f.location.value.trim()) {
      data.location = f.location.value.trim();
      data.message = (data.message ? data.message + '\n' : '') + 'Location: ' + data.location;
    }
    if (form.getAttribute('data-lang')) data.lang = form.getAttribute('data-lang');

    if (!data.name || !data.email) { say('bad', text.missing); return; }

    try {
      var raw = sessionStorage.getItem('omnidesq_utm');
      if (raw) data.utm = JSON.parse(raw);
    } catch (e2) {}
    data.referrer = document.referrer || '';
    data.landingPage = window.location.href;

    btn.disabled = true;
    btn.textContent = text.sending;
    try {
      var result = await sendLead(data);
      if (result && result.success) {
        say('ok', text.thanks || result.message);
        form.reset();
        btn.textContent = text.sent;
        if (typeof gtag === 'function') gtag('event', 'generate_lead', { currency: 'USD', value: 299 });
        if (typeof fbq === 'function') fbq('track', 'Lead', { currency: 'USD', value: 299 });
      } else {
        say('bad', (result && result.message) || text.failed);
        btn.disabled = false;
        btn.textContent = label;
      }
    } catch (err) {
      say('bad', text.failed);
      btn.disabled = false;
      btn.textContent = label;
    }
  });
})();
