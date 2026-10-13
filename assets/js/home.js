(async function () {
  const { sb, esc, getSettings, initMotion, boot, reduced, refresh } = window.GC;
  const { board, flipIn, newsCard, baseMap, pinIcon } = window.GCC;
  boot('');

  const iso = (x) => x.toISOString().slice(0, 10);
  const todayIso = iso(new Date());

  const [settings, evRes, newsRes, golfRes, galRes, partRes] = await Promise.all([
    getSettings(),
    sb.from('golfcentre_events').select('*').or(`start_date.gte.${todayIso},end_date.gte.${todayIso}`).order('start_date').limit(8),
    sb.from('golfcentre_posts').select('slug,title,excerpt,cover_url,category,published_at,featured').eq('published', true).order('published_at', { ascending: false }).limit(5),
    sb.from('golfcentre_golfs').select('name,lat,lng,department,category,city'),
    sb.from('golfcentre_gallery').select('image_url,album').neq('caption', 'Supports de communication').limit(400),
    sb.from('golfcentre_partners').select('*').order('sort')
  ]);

  // ---- Textes d'accueil (modifiables dans l'admin) ----
  const h = settings.home || {};
  if (h.hero_title) document.getElementById('hero-title').textContent = h.hero_title;
  if (h.hero_text) document.getElementById('hero-text').textContent = h.hero_text;
  if (h.hero_image) document.getElementById('hero-photo').style.backgroundImage = `url('${h.hero_image}')`;
  if (h.licence_title) document.getElementById('lic-title').textContent = h.licence_title;
  if (h.licence_text) document.getElementById('lic-text').textContent = h.licence_text;
  if (h.licence_url) document.getElementById('lic-url').href = h.licence_url;
  if (h.licence_why_url) document.getElementById('lic-why').href = h.licence_why_url;

  // ---- Leaderboard ----
  const rows = document.getElementById('board-rows');
  rows.innerHTML = board(evRes.data || []);

  // ---- Actualités ----
  const posts = newsRes.data || [];
  const featured = posts.filter((p) => p.featured);
  const list = (featured.length >= 3 ? featured : posts).slice(0, 3);
  document.getElementById('home-news').innerHTML = list.map((p, i) => newsCard(p, i === 0)).join('') || '<p class="empty">Aucune actualité publiée pour le moment.</p>';

  // ---- Chemins ----
  const paths = h.paths || [];
  document.getElementById('home-paths').innerHTML = paths.map((p) => `
    <a class="path" href="${esc(p.href)}">
      ${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ''}
      ${p.pill ? `<span class="pill">${esc(p.pill)}</span>` : ''}
      <h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>
    </a>`).join('');

  // ---- Golfs ----
  const golfs = golfRes.data || [];
  document.getElementById('golf-count').dataset.count = golfs.length;
  const depts = ['Cher', 'Eure-et-Loir', 'Indre', 'Indre-et-Loire', 'Loir-et-Cher', 'Loiret'];
  document.getElementById('dept-list').innerHTML = depts.map((dp) => `<li><span>${dp}</span><b>${golfs.filter((g) => g.department === dp).length}</b></li>`).join('');
  try {
    const map = baseMap('mini-map', { dragging: false, zoomControl: false, doubleClickZoom: false, touchZoom: false, keyboard: false, attributionControl: true, dark: true });
    const inRegion = golfs.filter((g) => g.lat && g.department);
    inRegion.forEach((g) => L.marker([g.lat, g.lng], { icon: pinIcon(g), interactive: false }).addTo(map));
    if (inRegion.length) map.fitBounds(L.latLngBounds(inRegion.map((g) => [g.lat, g.lng])).pad(0.08));
  } catch (e) { console.warn(e); }

  // ---- Photothèque ----
  const gal = (galRes.data || []).sort(() => Math.random() - 0.5).slice(0, 14);
  const imgs = gal.map((g) => `<img src="${esc(g.image_url)}" alt="${esc(g.album)}" loading="lazy">`).join('');
  document.getElementById('home-marquee').innerHTML = imgs + imgs.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"');

  // ---- Partenaires ----
  document.getElementById('home-partners').innerHTML = (partRes.data || []).map((p) => `<a class="partner" href="${esc(p.website || '#')}" target="_blank" rel="noopener" title="${esc(p.name)}"><img src="${esc(p.logo_url)}" alt="${esc(p.name)}" loading="lazy"></a>`).join('');

  // ---- Animations ----
  initMotion();
  flipIn(rows);
  heroShot();

  function heroShot() {
    const G = window.gsap;
    const trail = document.getElementById('hero-trail');
    const ball = document.getElementById('hero-ball');
    const flag = document.getElementById('hero-flag');
    const carry = document.getElementById('ro-carry'), apex = document.getElementById('ro-apex'), speed = document.getElementById('ro-speed');
    const L0 = trail.getTotalLength();
    const setFrame = (p) => {
      trail.style.strokeDashoffset = L0 * (1 - p);
      const pt = trail.getPointAtLength(L0 * p);
      ball.setAttribute('cx', pt.x); ball.setAttribute('cy', pt.y - 2);
      ball.setAttribute('r', 9 + Math.sin(p * Math.PI) * 5);
      carry.textContent = Math.round(p * 247);
      apex.textContent = Math.round(34 * Math.min(1, p / 0.5));
      speed.textContent = p > 0.005 ? Math.round(168 - 62 * p) : 0;
    };
    trail.style.strokeDasharray = L0;
    if (!G || reduced) { setFrame(1); return; }
    // titre : les mots montent à l'ouverture
    const t = document.getElementById('hero-title');
    const words = t.textContent.trim().split(/\s+/);
    t.setAttribute('aria-label', t.textContent.trim());
    t.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span>${esc(w)}</span></span>`).join(' ');
    G.timeline()
      .fromTo('#hero-photo', { scale: 1.2, autoAlpha: 0 }, { scale: 1.08, autoAlpha: 1, duration: 1.6, ease: 'power2.out' })
      .fromTo(t.querySelectorAll('.w > span'), { yPercent: 115 }, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: .07 }, 0.15)
      .fromTo(['#hero-text', '.hero-ctas', '.readout', '.scroll-hint'], { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .8, stagger: .1, ease: 'power3.out' }, 0.7)
      .fromTo(ball, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: .5, ease: 'back.out(3)' }, 0.9);
    setFrame(0);
    const st = { p: 0 };
    G.to(st, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      onUpdate: () => setFrame(st.p)
    });
    G.to('.hero-content', { yPercent: -18, autoAlpha: .35, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: true } });
    G.to('#hero-photo', { scale: 1.2, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: true } });
    G.to('.scroll-hint', { autoAlpha: 0, scrollTrigger: { trigger: '#hero', start: 'top top', end: '10% top', scrub: true } });
    G.to(flag, { skewY: -8, scaleX: .86, transformOrigin: '0% 50%', duration: .9, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    refresh();
  }
})();
