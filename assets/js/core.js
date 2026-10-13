/* Ligue Centre-Val de Loire de Golf — socle commun */
(function () {
  const C = window.GC_CONFIG;
  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Navigation ----------
  const NAV = [
    { label: 'La Ligue', href: 'ligue.html', key: 'ligue', children: [
      { label: 'Le projet de la Ligue', href: 'page.html?p=projet-de-la-ligue' },
      { label: 'Comité directeur', href: 'ligue.html#comite' },
      { label: 'Permanents', href: 'ligue.html#permanents' },
      { label: 'Comités départementaux', href: 'page.html?p=comites-departementaux' },
      { label: 'Nous soutenir', href: 'page.html?p=nous-soutenir' },
      { label: 'Newsletters', href: 'page.html?p=newsletters' },
      { label: 'Photothèque', href: 'galerie.html' }
    ]},
    { label: 'Compétitions', href: 'competitions.html', key: 'competitions', children: [
      { label: 'Calendrier 2026', href: 'competitions.html' },
      { label: 'Ligue Jeunes', href: 'competitions.html?c=Ligue%20Jeunes' },
      { label: 'Grands Prix', href: 'competitions.html?c=Grands%20Prix' },
      { label: 'Séniors', href: 'competitions.html?c=S%C3%A9niors' },
      { label: 'Coupes du Centre', href: 'competitions.html?c=Coupes%20du%20Centre' },
      { label: 'Règlements & Vademecum', href: 'page.html?p=reglements-vademecum-1' }
    ]},
    { label: 'Commissions', href: 'commissions.html', key: 'commissions' },
    { label: 'Formations', href: 'formations.html', key: 'formations' },
    { label: 'Jouer', href: 'jouer.html', key: 'jouer', children: [
      { label: 'Golf Pour Tous', href: 'jouer.html#golf-pour-tous' },
      { label: 'Golf Tour', href: 'jouer.html#golf-tour' },
      { label: 'Golf Entreprise', href: 'jouer.html#golf-entreprise' }
    ]},
    { label: 'Les golfs', href: 'golfs.html', key: 'golfs' },
    { label: 'Actualités', href: 'actualites.html', key: 'actualites' }
  ];

  const SECTION_OF = { ligue: 'ligue', sportif: 'competitions', commissions: 'commissions', formations: 'formations', 'golf-pour-tous': 'jouer', 'golf-tour': 'jouer', 'golf-entreprise': 'jouer', legal: '' };

  // ---------- Utilitaires ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const decode = (s) => { const t = document.createElement('textarea'); t.innerHTML = s ?? ''; return t.value.replace(/\s+/g, ' ').trim(); };
  const param = (k) => new URLSearchParams(location.search).get(k);
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MONTHS_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const d = (s) => { if (!s) return null; const [y, m, dd] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, dd); };
  const fmtDate = (s) => { const x = d(s); return x ? `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}` : ''; };
  const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
  const img = (url, w) => url || '';

  // ---------- Réglages (cache court) ----------
  let settingsPromise = null;
  function getSettings() {
    if (settingsPromise) return settingsPromise;
    settingsPromise = (async () => {
      try {
        const cached = JSON.parse(sessionStorage.getItem('gc_settings') || 'null');
        if (cached && Date.now() - cached.t < 5 * 60 * 1000) return cached.v;
      } catch (e) {}
      const { data } = await sb.from('golfcentre_settings').select('key,value');
      const v = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
      try { sessionStorage.setItem('gc_settings', JSON.stringify({ t: Date.now(), v })); } catch (e) {}
      return v;
    })();
    return settingsPromise;
  }

  // ---------- En-tête ----------
  function renderHeader(active) {
    const el = document.getElementById('site-header');
    if (!el) return;
    const items = NAV.map((n) => {
      const sub = n.children ? `<div class="mega"><ul>${n.children.map((c) => `<li><a href="${c.href}">${esc(c.label)}</a></li>`).join('')}</ul></div>` : '';
      return `<li class="nav-item${n.children ? ' has-sub' : ''}${active === n.key ? ' is-active' : ''}"><a href="${n.href}" class="nav-link">${esc(n.label)}</a>${sub}</li>`;
    }).join('');
    el.innerHTML = `
      <div class="ball-progress" aria-hidden="true"><div class="bp-track"></div><div class="bp-fill"></div><div class="bp-ball"></div><svg class="bp-flag" viewBox="0 0 14 22"><line x1="2" y1="1" x2="2" y2="21"/><path d="M2 1 L13 5 L2 9 Z"/></svg></div>
      <nav class="topbar" aria-label="Navigation principale">
        <a href="index.html" class="brand" aria-label="Accueil — Ligue Centre-Val de Loire de Golf">
          <img src="${C.LOGO}" alt="ffgolf — Ligue du Centre-Val de Loire" class="brand-dark" width="164" height="64">
          <img src="${C.LOGO_LIGHT}" alt="" class="brand-light" width="164" height="64">
        </a>
        <ul class="nav">${items}</ul>
        <a href="contact.html" class="btn btn-sm btn-sky nav-cta">Contact</a>
        <button class="burger" aria-label="Ouvrir le menu" aria-expanded="false"><span></span><span></span></button>
      </nav>
      <div class="drawer" hidden>
        <ul>${NAV.map((n) => `<li><a href="${n.href}">${esc(n.label)}</a>${n.children ? `<ul>${n.children.map((c) => `<li><a href="${c.href}">${esc(c.label)}</a></li>`).join('')}</ul>` : ''}</li>`).join('')}<li><a href="contact.html">Contact</a></li></ul>
      </div>`;
    const burger = el.querySelector('.burger'), drawer = el.querySelector('.drawer');
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Ouvrir le menu' : 'Fermer le menu');
      drawer.hidden = open; document.body.classList.toggle('drawer-open', !open);
    });
    const onScroll = () => {
      el.classList.toggle('is-scrolled', window.scrollY > 40);
      const h = document.documentElement.scrollHeight - innerHeight;
      el.style.setProperty('--p', h > 0 ? Math.min(1, scrollY / h) : 0);
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // ---------- Pied de page ----------
  async function renderFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const s = await getSettings();
    const c = s.contact || {}, so = s.social || {}, links = s.links || [];
    const icon = {
      facebook: '<path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6z"/>',
      instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2"/>',
      linkedin: '<path d="M5 9h3v11H5zM6.5 4a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6zM10 9h3v1.6c.5-.9 1.6-1.8 3.4-1.8 3 0 3.6 2 3.6 4.6V20h-3v-5.6c0-1.3 0-3-1.8-3s-2.2 1.4-2.2 2.9V20h-3z"/>',
      twitter: '<path d="M4 4l6.8 9L4 20h2l5.6-5.9L16 20h4l-7.1-9.4L19.3 4h-2l-5.2 5.5L8 4z"/>'
    };
    const socials = ['facebook', 'instagram', 'linkedin', 'twitter'].filter((k) => so[k]).map((k) => `<a href="${esc(so[k])}" target="_blank" rel="noopener" aria-label="${k}"><svg viewBox="0 0 24 24" fill="currentColor">${icon[k]}</svg></a>`).join('');
    el.innerHTML = `
      <div class="footer-green" aria-hidden="true">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 80 C 240 20, 480 20, 720 60 S 1200 110, 1440 40 L1440 120 L0 120 Z"/></svg>
      </div>
      <div class="footer-inner wrap">
        <div class="f-brand">
          <img src="${C.LOGO_LIGHT}" alt="ffgolf — Ligue du Centre-Val de Loire" width="190" height="74">
          <p>La Ligue fait vivre le golf dans le Cher, l'Eure-et-Loir, l'Indre, l'Indre-et-Loire, le Loir-et-Cher et le Loiret.</p>
          <div class="socials">${socials}</div>
        </div>
        <div class="f-col">
          <h3>Nous trouver</h3>
          <address>${esc(c.name || '')}<br>${esc(c.address || '')}<br>${esc(c.zip || '')} ${esc(c.city || '')}</address>
          <p><a href="mailto:${esc(c.email)}">${esc(c.email || '')}</a><br><a href="tel:${esc((c.phone || '').replace(/\s/g, ''))}">${esc(c.phone || '')}</a></p>
        </div>
        <div class="f-col">
          <h3>Liens utiles</h3>
          <ul>${links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join('')}</ul>
        </div>
        <div class="f-col">
          <h3>Documentation</h3>
          <ul>
            <li><a href="page.html?p=reglements-vademecum">Vademecum fédéral</a></li>
            <li><a href="page.html?p=reglements-vademecum-1">Vademecum de Ligue</a></li>
            <li><a href="page.html?p=vademecum">Vademecum golf entreprise</a></li>
            <li><a href="galerie.html">Photothèque</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-legal wrap">
        <span>© ${new Date().getFullYear()} Ligue Centre-Val de Loire de Golf</span>
        <a href="page.html?p=mentions-legales-credits">Mentions légales & crédits</a>
        <a href="admin/" class="admin-link">Espace admin</a>
      </div>`;
  }

  // ---------- Bandeau de page ----------
  function pageHero({ title, subtitle, crumbs = [], image }) {
    const el = document.getElementById('page-hero');
    if (!el) return;
    el.innerHTML = `
      ${image ? `<div class="ph-bg" style="background-image:url('${esc(image)}')" data-parallax></div>` : ''}
      <div class="ph-inner wrap">
        <nav class="crumbs" aria-label="Fil d'Ariane"><a href="index.html">Accueil</a>${crumbs.map((c) => c.href ? `<span>/</span><a href="${c.href}">${esc(c.label)}</a>` : `<span>/</span><span>${esc(c.label)}</span>`).join('')}</nav>
        <h1 class="ph-title" data-split>${esc(title)}</h1>
        ${subtitle ? `<p class="ph-sub">${esc(subtitle)}</p>` : ''}
      </div>
      <svg class="ph-arc" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 150 Q 600 -60 1210 150" /></svg>`;
    if (title) document.title = `${title} — Ligue Centre-Val de Loire de Golf`;
  }

  // ---------- Animations ----------
  function splitWords(node) {
    if (node.dataset.splitDone) return;
    const words = node.textContent.trim().split(/\s+/);
    node.setAttribute('aria-label', node.textContent.trim());
    node.innerHTML = words.map((w) => `<span class="w" aria-hidden="true"><span>${esc(w)}</span></span>`).join(' ');
    node.dataset.splitDone = '1';
  }

  let lenis = null;
  function initMotion(root = document) {
    const G = window.gsap;
    if (!G || reduced) {
      root.querySelectorAll('[data-reveal],[data-stagger] > *').forEach((n) => n.classList.add('is-in'));
      root.querySelectorAll('[data-count]').forEach((n) => (n.textContent = n.dataset.count));
      return;
    }
    G.registerPlugin(window.ScrollTrigger);
    if (!lenis && window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
      lenis.on('scroll', window.ScrollTrigger.update);
      G.ticker.add((t) => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
    }
    root.querySelectorAll('[data-split]').forEach((n) => {
      splitWords(n);
      G.fromTo(n.querySelectorAll('.w > span'), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.06, scrollTrigger: { trigger: n, start: 'top 88%' } });
    });
    root.querySelectorAll('[data-reveal]').forEach((n) => {
      G.fromTo(n, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 90%' } });
    });
    root.querySelectorAll('[data-stagger]').forEach((n) => {
      G.fromTo(n.children, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: n, start: 'top 88%' } });
    });
    root.querySelectorAll('[data-parallax]').forEach((n) => {
      G.fromTo(n, { yPercent: -8, scale: 1.12 }, { yPercent: 8, scale: 1.12, ease: 'none', scrollTrigger: { trigger: n.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    root.querySelectorAll('[data-count]').forEach((n) => {
      const end = parseFloat(n.dataset.count) || 0; const o = { v: 0 };
      G.to(o, { v: end, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: n, start: 'top 90%' }, onUpdate: () => (n.textContent = Math.round(o.v)) });
    });
    root.querySelectorAll('.ph-arc path').forEach((p) => {
      const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      G.to(p, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', delay: 0.2 });
    });
    window.ScrollTrigger.refresh();
  }

  function refresh() { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }

  // ---------- Démarrage commun ----------
  async function boot(active) {
    renderHeader(active);
    renderFooter();
  }

  window.GC = { sb, NAV, SECTION_OF, esc, decode, param, fmtDate, d, today, MONTHS, MONTHS_S, DAYS, img, getSettings, renderHeader, renderFooter, pageHero, initMotion, refresh, boot, reduced, C };
})();
