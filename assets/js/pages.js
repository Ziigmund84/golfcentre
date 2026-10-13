/* Contrôleurs des pages intérieures */
(async function () {
  const { sb, esc, decode, param, fmtDate, pageHero, initMotion, boot, getSettings, SECTION_OF, refresh } = window.GC;
  const { board, flipIn, newsCard, baseMap, pinIcon } = window.GCC;
  const page = document.body.dataset.page;
  const ACTIVE = { competitions: 'competitions', actualites: 'actualites', article: 'actualites', ligue: 'ligue', commissions: 'commissions', formations: 'formations', jouer: 'jouer', golfs: 'golfs', galerie: 'ligue', contact: '' };
  boot(ACTIVE[page] ?? '');

  const SECTION_META = {
    ligue: { title: 'La Ligue', href: 'ligue.html' },
    sportif: { title: 'Compétitions', href: 'competitions.html' },
    commissions: { title: 'Commissions', href: 'commissions.html' },
    formations: { title: 'Formations & arbitrage', href: 'formations.html' },
    'golf-pour-tous': { title: 'Golf Pour Tous', href: 'jouer.html#golf-pour-tous' },
    'golf-tour': { title: 'Golf Tour', href: 'jouer.html#golf-tour' },
    'golf-entreprise': { title: 'Golf Entreprise', href: 'jouer.html#golf-entreprise' },
    legal: { title: 'Informations', href: 'index.html' }
  };

  const tile = (p) => `<a class="tile" href="page.html?p=${encodeURIComponent(p.slug)}">
      <div class="t-img">${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="" loading="lazy">` : ''}</div>
      <div class="t-body"><h3>${esc(p.title)}</h3>${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ''}</div></a>`;
  async function sectionTiles(section, el) {
    const { data } = await sb.from('golfcentre_pages').select('slug,title,subtitle,cover_url,sort').eq('section', section).eq('published', true).order('sort');
    document.getElementById(el).innerHTML = (data || []).map(tile).join('') || '<p class="empty">Aucune page pour le moment.</p>';
  }
  const initials = (n) => n.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const person = (p) => `<div class="person">
      <div class="ph">${p.photo_url ? `<img src="${esc(p.photo_url)}" alt="" loading="lazy">` : `<span class="ini">${esc(initials(p.name))}</span>`}</div>
      <h3>${esc(p.name)}</h3>${p.role ? `<p class="role">${esc(p.role)}</p>` : ''}
      ${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}${p.phone ? `<a href="tel:${esc(p.phone.replace(/\s/g, ''))}">${esc(p.phone)}</a>` : ''}
    </div>`;

  const run = {
    // ---------------- Compétitions ----------------
    async competitions() {
      pageHero({ title: 'Calendrier des compétitions', subtitle: 'Toutes les épreuves de la saison 2026, de la Ligue Jeunes au golf entreprise.', crumbs: [{ label: 'Compétitions' }] });
      const { data } = await sb.from('golfcentre_events').select('*').eq('published', true).order('start_date');
      const events = data || [];
      const cats = [...new Set(events.map((e) => e.category))].sort((a, b) => a.localeCompare(b, 'fr'));
      const state = { when: 'upcoming', cat: param('c') || '', q: '' };
      if (state.cat) state.when = 'all';
      const catsEl = document.getElementById('cats');
      catsEl.innerHTML = [`<button class="chip" data-c="" aria-pressed="${!state.cat}">Toutes</button>`, ...cats.map((c) => `<button class="chip" data-c="${esc(c)}" aria-pressed="${state.cat === c}">${esc(c)}</button>`)].join('');
      const rows = document.getElementById('comp-rows');
      const todayIso = new Date().toISOString().slice(0, 10);
      const render = () => {
        let list = events.filter((e) => (!state.cat || e.category === state.cat));
        if (state.when === 'upcoming') list = list.filter((e) => (e.end_date || e.start_date) >= todayIso);
        if (state.when === 'past') list = list.filter((e) => (e.end_date || e.start_date) < todayIso).reverse();
        if (state.q) { const q = state.q.toLowerCase(); list = list.filter((e) => `${e.title} ${e.venue} ${e.category}`.toLowerCase().includes(q)); }
        rows.innerHTML = board(list, { groupByMonth: true });
        refresh();
      };
      document.querySelectorAll('#when button').forEach((b) => b.addEventListener('click', () => {
        state.when = b.dataset.v; document.querySelectorAll('#when button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render();
      }));
      document.querySelectorAll('#when button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === state.when)));
      catsEl.addEventListener('click', (ev) => {
        const b = ev.target.closest('.chip'); if (!b) return;
        state.cat = b.dataset.c; catsEl.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render();
      });
      let t; document.getElementById('q').addEventListener('input', (ev) => { clearTimeout(t); t = setTimeout(() => { state.q = ev.target.value.trim(); render(); }, 150); });
      render();
      flipIn(rows);
      await sectionTiles('sportif', 'rules');
      const ge = await sb.from('golfcentre_pages').select('slug,title,subtitle,cover_url').in('slug', ['vademecum', 'competitions-de-ligue']);
      document.getElementById('rules').insertAdjacentHTML('beforeend', (ge.data || []).map(tile).join(''));
      const docs = await sb.from('golfcentre_documents').select('*').order('sort');
      if ((docs.data || []).length) {
        document.getElementById('rules').insertAdjacentHTML('afterend', `<div class="prose" style="margin-top:40px"><h3>Documents à télécharger</h3><p>${docs.data.map((x) => `<a href="${esc(x.file_url)}" target="_blank" rel="noopener">${esc(x.title)}</a>`).join(' ')}</p></div>`);
      }
    },

    // ---------------- Actualités ----------------
    async actualites() {
      pageHero({ title: 'Actualités', subtitle: 'Résultats, sélections, vie des clubs et newsletters de la Ligue.', crumbs: [{ label: 'Actualités' }] });
      const cats = ['Toutes', 'Compétition', 'Vie de la Ligue', 'Newsletter'];
      const catEl = document.getElementById('news-cats');
      const state = { cat: '', page: 0 };
      const PER = 12;
      catEl.innerHTML = cats.map((c, i) => `<button class="chip" data-c="${i ? esc(c) : ''}" aria-pressed="${i === 0}">${esc(c)}</button>`).join('');
      const list = document.getElementById('news-list'), more = document.getElementById('news-more');
      const load = async (reset) => {
        if (reset) { state.page = 0; list.innerHTML = ''; }
        let q = sb.from('golfcentre_posts').select('slug,title,excerpt,cover_url,category,published_at').eq('published', true).order('published_at', { ascending: false }).range(state.page * PER, state.page * PER + PER);
        if (state.cat) q = q.eq('category', state.cat);
        const { data } = await q;
        const items = (data || []).slice(0, PER);
        list.insertAdjacentHTML('beforeend', items.map((p, i) => newsCard(p, reset && i === 0 && !state.cat)).join('') || (reset ? '<p class="empty">Aucune actualité dans cette catégorie.</p>' : ''));
        more.hidden = (data || []).length <= PER;
        refresh();
      };
      catEl.addEventListener('click', (ev) => { const b = ev.target.closest('.chip'); if (!b) return; state.cat = b.dataset.c; catEl.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(true); });
      more.addEventListener('click', () => { state.page++; load(false); });
      await load(true);
    },

    // ---------------- Article ----------------
    async article() {
      const slug = param('s');
      const { data: p } = await sb.from('golfcentre_posts').select('*').eq('slug', slug).maybeSingle();
      const title = document.getElementById('a-title');
      title.classList.remove('skeleton'); title.removeAttribute('style');
      if (!p) { title.textContent = 'Actualité introuvable'; document.getElementById('a-body').innerHTML = '<p>Cette actualité n\'existe plus. <a href="actualites.html">Voir toutes les actualités</a>.</p>'; return; }
      document.title = `${p.title} — Ligue Centre-Val de Loire de Golf`;
      title.textContent = p.title; title.setAttribute('data-split', '');
      document.getElementById('a-meta').innerHTML = `<span>${esc(fmtDate(p.published_at))}</span><span>${esc(p.category || '')}</span>`;
      if (p.cover_url) document.getElementById('a-cover').innerHTML = `<img src="${esc(p.cover_url)}" alt="">`;
      else document.querySelector('.article-cover-bg').style.background = 'var(--navy)';
      document.getElementById('a-body').innerHTML = p.body || `<p>${esc(decode(p.excerpt || ''))}</p>`;
      document.querySelectorAll('#a-body a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
      const url = encodeURIComponent(location.href);
      document.getElementById('a-share').innerHTML = `<strong>Partager</strong>
        <a class="btn btn-sm btn-line" href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener">Facebook</a>
        <a class="btn btn-sm btn-line" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noopener">LinkedIn</a>
        <a class="btn btn-sm btn-line" href="mailto:?subject=${encodeURIComponent(p.title)}&body=${url}">E-mail</a>`;
      const { data: more } = await sb.from('golfcentre_posts').select('slug,title,excerpt,cover_url,category,published_at').eq('published', true).neq('slug', slug).order('published_at', { ascending: false }).limit(3);
      document.getElementById('a-more').innerHTML = (more || []).map((x) => newsCard(x)).join('');
    },

    // ---------------- Page de contenu ----------------
    async page() {
      const slug = param('p') || 'la-ligue';
      const { data: p } = await sb.from('golfcentre_pages').select('*').eq('slug', slug).maybeSingle();
      if (!p) {
        pageHero({ title: 'Page introuvable', crumbs: [] });
        document.getElementById('page-body').innerHTML = '<p>Cette page n\'existe pas ou a été déplacée. <a href="index.html">Retour à l\'accueil</a>.</p>';
        document.getElementById('side-nav').remove();
        return;
      }
      const meta = SECTION_META[p.section] || { title: '', href: 'index.html' };
      window.GC.renderHeader(SECTION_OF[p.section] || '');
      pageHero({ title: p.title, subtitle: p.subtitle, crumbs: [{ label: meta.title, href: meta.href }, { label: p.title }] });
      document.getElementById('page-body').innerHTML = p.body || '';
      document.querySelectorAll('#page-body a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
      const { data: sib } = await sb.from('golfcentre_pages').select('slug,title').eq('section', p.section).eq('published', true).order('sort');
      const nav = document.getElementById('side-nav');
      if (!sib || sib.length < 2) { nav.remove(); document.querySelector('.page-layout').style.gridTemplateColumns = '1fr'; }
      else nav.innerHTML = `<h2>${esc(meta.title)}</h2><ul>${sib.map((s) => `<li><a href="page.html?p=${encodeURIComponent(s.slug)}"${s.slug === slug ? ' aria-current="page"' : ''}>${esc(s.title)}</a></li>`).join('')}</ul>`;
    },

    // ---------------- La Ligue ----------------
    async ligue() {
      pageHero({ title: 'La Ligue', subtitle: 'Une ligue sportive où l\'on se sent bien : des champions, des bénévoles, des clubs et des curieux.', crumbs: [{ label: 'La Ligue' }] });
      const [intro, people, golfs, ev] = await Promise.all([
        sb.from('golfcentre_pages').select('body').eq('slug', 'la-ligue').maybeSingle(),
        sb.from('golfcentre_people').select('*').order('sort'),
        sb.from('golfcentre_golfs').select('id', { count: 'exact', head: true }),
        sb.from('golfcentre_events').select('id', { count: 'exact', head: true })
      ]);
      document.getElementById('ligue-intro').innerHTML = intro.data?.body || '';
      document.getElementById('ligue-stats').innerHTML = `
        <div class="stat"><b data-count="6">6</b><span>départements</span></div>
        <div class="stat"><b data-count="${golfs.count || 0}">${golfs.count || 0}</b><span>golfs et structures</span></div>
        <div class="stat"><b data-count="${ev.count || 0}">${ev.count || 0}</b><span>épreuves cette saison</span></div>`;
      const ppl = people.data || [];
      document.getElementById('p-bureau').innerHTML = ppl.filter((x) => x.grp === 'Bureau directeur').map(person).join('');
      document.getElementById('p-comite').innerHTML = ppl.filter((x) => x.grp === 'Comité directeur').map(person).join('');
      document.getElementById('p-perm').innerHTML = ppl.filter((x) => x.grp === 'Permanents').map(person).join('');
      const { data } = await sb.from('golfcentre_pages').select('slug,title,subtitle,cover_url').eq('section', 'ligue').eq('published', true).neq('slug', 'la-ligue').order('sort');
      document.getElementById('ligue-tiles').innerHTML = (data || []).map(tile).join('') + `<a class="tile" href="galerie.html"><div class="t-img"></div><div class="t-body"><h3>Photothèque</h3><p>La saison en images.</p></div></a>`;
    },

    async commissions() {
      pageHero({ title: 'Commissions', subtitle: 'Jeunes, scolaire, santé, environnement, femmes, paragolf : les chantiers qui font grandir le golf dans la région.', crumbs: [{ label: 'Commissions' }] });
      await sectionTiles('commissions', 'sec-commissions');
    },
    async formations() {
      pageHero({ title: 'Formations & arbitrage', subtitle: 'Arbitres, organisateurs, animateurs bénévoles : se former pour faire vivre les compétitions.', crumbs: [{ label: 'Formations' }] });
      await sectionTiles('formations', 'sec-formations');
    },
    async jouer() {
      pageHero({ title: 'Jouer près de chez vous', subtitle: 'Golf Pour Tous, Golf Tour, golf entreprise : trois portes d\'entrée pour pratiquer à votre rythme.', crumbs: [{ label: 'Jouer' }] });
      await Promise.all([sectionTiles('golf-pour-tous', 'sec-golf-pour-tous'), sectionTiles('golf-tour', 'sec-golf-tour'), sectionTiles('golf-entreprise', 'sec-golf-entreprise')]);
      if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 300);
    },

    // ---------------- Annuaire des golfs ----------------
    async golfs() {
      const { data } = await sb.from('golfcentre_golfs').select('*').order('name');
      const golfs = (data || []).filter((g) => g.lat && g.lng);
      const map = baseMap('golfs-map', { scrollWheelZoom: true });
      const markers = new Map();
      const state = { q: '', dept: '', cat: '' };
      const depts = [...new Set(golfs.map((g) => g.department).filter(Boolean))].sort();
      document.getElementById('g-dept').insertAdjacentHTML('beforeend', depts.map((x) => `<option>${esc(x)}</option>`).join('') + '<option value="__hors">Hors région</option>');
      const cats = [...new Set(golfs.map((g) => g.category).filter(Boolean))];
      const catEl = document.getElementById('g-cat');
      catEl.innerHTML = [`<button class="chip" data-c="" aria-pressed="true">Tous</button>`, ...cats.map((c) => `<button class="chip" data-c="${esc(c)}" aria-pressed="false">${esc(c)}</button>`)].join('');
      const listEl = document.getElementById('g-list');
      let active = null;
      const select = (id, fly = true) => {
        active = id;
        listEl.querySelectorAll('.golf-item').forEach((n) => n.classList.toggle('is-active', n.dataset.id === id));
        markers.forEach((m, k) => m.setIcon(pinIcon(m.options.g, k === id)));
        const m = markers.get(id); if (m && fly) { map.flyTo(m.getLatLng(), 12, { duration: .8 }); m.openPopup(); }
      };
      const render = () => {
        const q = state.q.toLowerCase();
        const list = golfs.filter((g) => (!state.cat || g.category === state.cat)
          && (!state.dept || (state.dept === '__hors' ? !g.department : g.department === state.dept))
          && (!q || `${g.name} ${g.city || ''} ${g.address || ''}`.toLowerCase().includes(q)));
        document.getElementById('g-count').textContent = list.length;
        listEl.innerHTML = list.map((g) => `<button class="golf-item" data-id="${g.id}" type="button">
            <h3>${esc(g.name)}</h3><div class="gi-meta">${esc([g.city, g.department].filter(Boolean).join(' · '))}</div>
            <div class="tags">${g.category ? `<span class="tag gold">${esc(g.category)}</span>` : ''}${g.holes ? `<span class="tag">${esc(g.holes)}</span>` : ''}${g.structure ? `<span class="tag">${esc(g.structure)}</span>` : ''}</div>
            <div class="golf-detail">${g.address ? `<p>${esc(g.address)}</p>` : ''}${g.phone ? `<p><a href="tel:${esc(g.phone.replace(/\s/g, ''))}">${esc(g.phone)}</a></p>` : ''}${g.email ? `<p><a href="mailto:${esc(g.email)}">${esc(g.email)}</a></p>` : ''}${g.website ? `<p><a href="${esc(g.website)}" target="_blank" rel="noopener">Site internet</a></p>` : ''}</div>
          </button>`).join('') || '<p class="empty">Aucun golf ne correspond.</p>';
        markers.forEach((m, id) => { const vis = list.some((g) => g.id === id); if (vis && !map.hasLayer(m)) m.addTo(map); if (!vis && map.hasLayer(m)) map.removeLayer(m); });
        const pts = list.map((g) => [g.lat, g.lng]);
        if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.1), { maxZoom: 12 });
      };
      golfs.forEach((g) => {
        const m = L.marker([g.lat, g.lng], { icon: pinIcon(g), g, title: g.name }).bindPopup(`<b>${esc(g.name)}</b><br>${esc(g.city || '')}${g.website ? `<br><a href="${esc(g.website)}" target="_blank" rel="noopener">Site internet</a>` : ''}`);
        m.on('click', () => { select(g.id, false); listEl.querySelector(`[data-id="${g.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
        markers.set(g.id, m);
      });
      listEl.addEventListener('click', (ev) => { const b = ev.target.closest('.golf-item'); if (b && !ev.target.closest('a')) select(b.dataset.id); });
      let t; document.getElementById('g-q').addEventListener('input', (ev) => { clearTimeout(t); t = setTimeout(() => { state.q = ev.target.value.trim(); render(); }, 150); });
      document.getElementById('g-dept').addEventListener('change', (ev) => { state.dept = ev.target.value; render(); });
      catEl.addEventListener('click', (ev) => { const b = ev.target.closest('.chip'); if (!b) return; state.cat = b.dataset.c; catEl.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); });
      state.dept = ''; render();
      const inRegion = golfs.filter((g) => g.department).map((g) => [g.lat, g.lng]);
      if (inRegion.length) map.fitBounds(L.latLngBounds(inRegion).pad(0.05));
    },

    // ---------------- Photothèque ----------------
    async galerie() {
      pageHero({ title: 'Photothèque', subtitle: 'Compétitions, stages, Golf Tour, vie de la Ligue : la saison en images.', crumbs: [{ label: 'La Ligue', href: 'ligue.html' }, { label: 'Photothèque' }] });
      const { data } = await sb.from('golfcentre_gallery').select('*').order('sort');
      const albums = []; const byName = new Map();
      (data || []).forEach((r) => { if (!byName.has(r.album)) { const a = { name: r.album, cat: r.caption || 'Albums', photos: [] }; byName.set(r.album, a); albums.push(a); } byName.get(r.album).photos.push(r); });
      const cats = [...new Set(albums.map((a) => a.cat))];
      const catEl = document.getElementById('alb-cats'), grid = document.getElementById('albums');
      catEl.innerHTML = [`<button class="chip" data-c="" aria-pressed="true">Tous les albums</button>`, ...cats.map((c) => `<button class="chip" data-c="${esc(c)}" aria-pressed="false">${esc(c)}</button>`)].join('');
      const render = (cat) => {
        grid.innerHTML = albums.filter((a) => !cat || a.cat === cat).map((a) => `<button class="album" type="button" data-a="${esc(a.name)}">
          <div class="a-cover">${a.photos.slice(0, 3).map((p, i) => `<img src="${esc(p.image_url)}" alt="" loading="lazy">`).join('')}</div>
          <div class="a-body"><h3>${esc(a.name)}</h3><p>${a.photos.length} photo${a.photos.length > 1 ? 's' : ''} · ${esc(a.cat)}</p></div></button>`).join('');
        refresh();
      };
      render('');
      catEl.addEventListener('click', (ev) => { const b = ev.target.closest('.chip'); if (!b) return; catEl.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(b.dataset.c); });
      const lb = document.getElementById('lightbox'); let opener = null;
      grid.addEventListener('click', (ev) => {
        const b = ev.target.closest('.album'); if (!b) return; opener = b;
        const a = byName.get(b.dataset.a);
        document.getElementById('lb-title').textContent = a.name;
        document.getElementById('lb-grid').innerHTML = a.photos.map((p) => `<img src="${esc(p.image_url)}" alt="${esc(p.caption || a.name)}" loading="lazy">`).join('');
        lb.hidden = false; document.body.style.overflow = 'hidden'; document.getElementById('lb-close').focus();
      });
      const close = () => { lb.hidden = true; document.body.style.overflow = ''; opener?.focus(); };
      document.getElementById('lb-close').addEventListener('click', close);
      addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) close(); });
    },

    // ---------------- Contact ----------------
    async contact() {
      pageHero({ title: 'Contact', subtitle: 'La Ligue vous répond à la Maison des Sports d\'Olivet.', crumbs: [{ label: 'Contact' }] });
      const s = await getSettings(); const c = s.contact || {};
      document.getElementById('c-card').innerHTML = `<h2>${esc(c.name || 'Ligue Centre-Val de Loire de Golf')}</h2>
        <dl><dt>Adresse</dt><dd>${esc(c.address || '')}<br>${esc(c.zip || '')} ${esc(c.city || '')}</dd>
        <dt>E-mail</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email || '')}</a></dd>
        <dt>Téléphone</dt><dd><a href="tel:${esc((c.phone || '').replace(/\s/g, ''))}">${esc(c.phone || '')}</a></dd></dl>
        <a class="btn btn-gold" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((c.address || '') + ' ' + (c.zip || '') + ' ' + (c.city || ''))}" target="_blank" rel="noopener">Itinéraire</a>`;
      try {
        if (c.lat && c.lng) {
          const map = baseMap('c-map'); map.setView([c.lat, c.lng], 14);
          L.marker([c.lat, c.lng], { icon: pinIcon({}) }).addTo(map).bindPopup(`<b>${esc(c.name || '')}</b><br>${esc(c.address || '')}`);
        }
      } catch (e) {}
      const form = document.getElementById('c-form'), fb = document.getElementById('c-feedback');
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const f = new FormData(form);
        if (f.get('website')) return;
        const name = String(f.get('name') || '').trim(), email = String(f.get('email') || '').trim(), message = String(f.get('message') || '').trim();
        if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || message.length < 5) { fb.innerHTML = '<p class="form-msg err">Renseignez votre nom, une adresse e-mail valide et votre message.</p>'; return; }
        const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Envoi…';
        const { error } = await sb.from('golfcentre_messages').insert({ name, email, subject: f.get('subject'), message });
        btn.disabled = false; btn.textContent = 'Envoyer le message';
        if (error) fb.innerHTML = '<p class="form-msg err">Le message n\'est pas parti. Réessayez ou écrivez directement à ' + esc(c.email || 'la Ligue') + '.</p>';
        else { fb.innerHTML = '<p class="form-msg ok">Message envoyé. L\'équipe de la Ligue vous répondra par e-mail.</p>'; form.reset(); }
      });
    },

    async '404'() { pageHero({ title: 'Page introuvable', crumbs: [] }); }
  };

  try { await (run[page] && run[page]()); } catch (e) { console.error(e); }
  initMotion();
})();
