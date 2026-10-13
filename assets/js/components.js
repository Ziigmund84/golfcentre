/* Composants partagés : leaderboard, cartes d'actualité, carte des golfs */
(function () {
  const { esc, decode, d, MONTHS, MONTHS_S, DAYS, fmtDate, today } = window.GC;

  function statusOf(e) {
    const s = (e.status || '').toLowerCase();
    const start = d(e.start_date), end = d(e.end_date) || start;
    if (s.includes('résultat') && !s.includes('attente')) return { label: 'Résultats', cls: 'is-results' };
    if (end && end < today()) return { label: e.status || 'Terminé', cls: s.includes('attente') ? '' : 'is-results' };
    if (s.includes('départ') && !s.includes('attente')) return { label: 'Départs publiés', cls: 'is-soon' };
    if (s) return { label: e.status, cls: 'is-soon' };
    return { label: 'À venir', cls: 'is-soon' };
  }

  function dateRange(e) {
    const a = d(e.start_date), b = d(e.end_date);
    if (!a) return '';
    if (!b || +a === +b) return `${DAYS[a.getDay()]} ${a.getDate()} ${MONTHS[a.getMonth()]}`;
    return `du ${a.getDate()}${a.getMonth() !== b.getMonth() ? ' ' + MONTHS[a.getMonth()] : ''} au ${b.getDate()} ${MONTHS[b.getMonth()]}`;
  }

  function boardRow(e) {
    const a = d(e.start_date), st = statusOf(e);
    const href = e.link_url || '#';
    const ext = /^https?:/.test(href);
    return `<a class="board-row" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>
      <span class="b-date"><span class="b-day">${a ? String(a.getDate()).padStart(2, '0') : '--'}</span><span class="b-mon">${a ? MONTHS_S[a.getMonth()] : ''}<br>${a ? DAYS[a.getDay()] : ''}</span></span>
      <span><span class="b-title">${esc(e.title)}</span>${e.end_date && e.end_date !== e.start_date ? `<br><small style="color:#9FD7F0">${esc(dateRange(e))}</small>` : ''}</span>
      <span class="b-venue">${esc(e.venue || 'Lieu à préciser')}${e.format ? `<br><small style="color:#7FB6D6">${esc(e.format)}</small>` : ''}</span>
      <span class="b-cat">${esc(e.category)}</span>
      <span class="b-status ${st.cls}">${esc(st.label)}</span>
    </a>`;
  }

  function board(events, { groupByMonth = false } = {}) {
    if (!events.length) return '<div class="board-empty">Aucune épreuve ne correspond à ces critères.</div>';
    if (!groupByMonth) return events.map(boardRow).join('');
    let out = '', cur = '';
    events.forEach((e) => {
      const a = d(e.start_date); const k = a ? `${MONTHS[a.getMonth()]} ${a.getFullYear()}` : '';
      if (k !== cur) { cur = k; out += `<div class="board-month">${esc(k.charAt(0).toUpperCase() + k.slice(1))}</div>`; }
      out += boardRow(e);
    });
    return out;
  }

  function flipIn(container) {
    const G = window.gsap;
    if (!G || window.GC.reduced) return;
    const rows = container.querySelectorAll('.board-row');
    G.fromTo(rows, { rotateX: -80, autoAlpha: 0, transformOrigin: '50% 0%' }, { rotateX: 0, autoAlpha: 1, duration: .7, ease: 'back.out(1.4)', stagger: .06, scrollTrigger: { trigger: container, start: 'top 85%' } });
    // les jours défilent comme un tableau à palettes
    container.querySelectorAll('.b-day').forEach((n) => {
      const end = parseInt(n.textContent, 10); if (isNaN(end)) return;
      const o = { v: 1 };
      G.to(o, { v: end, duration: 1.1, ease: 'steps(' + Math.max(1, end) + ')', scrollTrigger: { trigger: container, start: 'top 85%' }, onUpdate: () => (n.textContent = String(Math.round(o.v)).padStart(2, '0')) });
    });
  }

  function newsCard(p, lead = false) {
    return `<a class="news-card${lead ? ' is-lead' : ''}" href="article.html?s=${encodeURIComponent(p.slug)}">
      <div class="nc-img">${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="" loading="lazy">` : ''}</div>
      <div class="nc-body">
        <div class="nc-meta"><span class="nc-cat">${esc(p.category || 'Actualité')}</span><span>${esc(fmtDate(p.published_at))}</span></div>
        <h3 class="nc-title">${esc(p.title)}</h3>
        ${p.excerpt ? `<p class="nc-ex">${esc(decode(p.excerpt))}</p>` : ''}
      </div>
    </a>`;
  }

  const TILES = { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>' };
  function baseMap(el, opts = {}) {
    const map = L.map(el, Object.assign({ scrollWheelZoom: false, zoomControl: true }, opts)).setView([47.45, 1.6], 7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: TILES.attribution }).addTo(map);
    return map;
  }
  function pinIcon(g, active) {
    return L.divIcon({ className: '', html: `<div class="gc-pin${g.category === 'Entreprise' ? ' ent' : ''}${active ? ' is-active' : ''}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
  }

  window.GCC = { statusOf, dateRange, boardRow, board, flipIn, newsCard, baseMap, pinIcon };
})();
