/* Administration du site — Ligue Centre-Val de Loire de Golf */
(function () {
  const C = window.GC_CONFIG;
  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const fmt = (s) => s ? new Date(s.length <= 10 ? s + 'T12:00:00' : s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const toast = (msg, err) => { const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 3200); };

  // ---------- Téléversement des médias ----------
  async function toWebp(file, max = 1920) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    const bm = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bm.width, bm.height));
    const c = document.createElement('canvas'); c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s);
    c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.84));
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  }
  async function upload(file, folder = 'uploads') {
    const f = file.type.startsWith('image/') ? await toWebp(file) : file;
    const d = new Date();
    const path = `${folder}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${Date.now().toString(36)}-${slugify(f.name.replace(/\.[^.]+$/, ''))}.${(f.name.split('.').pop() || 'bin').toLowerCase()}`;
    const { error } = await sb.storage.from(C.BUCKET).upload(path, f, { contentType: f.type, upsert: false });
    if (error) throw error;
    return sb.storage.from(C.BUCKET).getPublicUrl(path).data.publicUrl;
  }

  // ---------- Éditeur de texte riche (conserve le HTML existant) ----------
  function richEditor(host, html) {
    host.innerHTML = `<div class="rte"><div class="rte-bar" role="toolbar" aria-label="Mise en forme">
      <button type="button" data-cmd="formatBlock" data-v="H2" title="Titre">T1</button>
      <button type="button" data-cmd="formatBlock" data-v="H3" title="Sous-titre">T2</button>
      <button type="button" data-cmd="formatBlock" data-v="P" title="Paragraphe">¶</button>
      <span class="sep"></span>
      <button type="button" data-cmd="bold" title="Gras"><b>G</b></button>
      <button type="button" data-cmd="italic" title="Italique"><i>I</i></button>
      <button type="button" data-cmd="insertUnorderedList" title="Liste">• Liste</button>
      <button type="button" data-cmd="insertOrderedList" title="Liste numérotée">1. Liste</button>
      <span class="sep"></span>
      <button type="button" data-act="link" title="Lien">Lien</button>
      <button type="button" data-act="image" title="Insérer une image">Image</button>
      <button type="button" data-act="file" title="Joindre un document">Document</button>
      <button type="button" data-cmd="removeFormat" title="Effacer la mise en forme">Effacer</button>
      <span class="sep"></span>
      <button type="button" data-act="src" aria-pressed="false" title="Code HTML">HTML</button>
    </div><div class="rte-area" contenteditable="true"></div><textarea class="rte-src" hidden spellcheck="false"></textarea>
    <input type="file" accept="image/*" hidden class="rte-img"><input type="file" hidden class="rte-file"></div>`;
    const area = $('.rte-area', host), src = $('.rte-src', host);
    area.innerHTML = html || '';
    let saved = null;
    const keep = () => { const s = getSelection(); if (s.rangeCount && area.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
    const restore = () => { area.focus(); if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); } };
    area.addEventListener('keyup', keep); area.addEventListener('mouseup', keep);
    host.querySelector('.rte-bar').addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    host.querySelector('.rte-bar').addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.cmd) { restore(); document.execCommand(b.dataset.cmd, false, b.dataset.v ? `<${b.dataset.v}>` : null); keep(); return; }
      const act = b.dataset.act;
      if (act === 'link') { restore(); const url = prompt('Adresse du lien (https://…)'); if (url) document.execCommand('createLink', false, url); }
      if (act === 'image') $('.rte-img', host).click();
      if (act === 'file') $('.rte-file', host).click();
      if (act === 'src') {
        const on = b.getAttribute('aria-pressed') !== 'true';
        if (on) { src.value = area.innerHTML; } else { area.innerHTML = src.value; }
        src.hidden = !on; area.hidden = on; b.setAttribute('aria-pressed', String(on));
      }
    });
    $('.rte-img', host).addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return; toast('Envoi de l\'image…');
      try { const url = await upload(f); restore(); document.execCommand('insertHTML', false, `<figure><img src="${url}" alt=""></figure><p></p>`); toast('Image ajoutée'); } catch (err) { toast('Échec de l\'envoi : ' + err.message, true); }
      e.target.value = '';
    });
    $('.rte-file', host).addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return; toast('Envoi du document…');
      try { const url = await upload(f, 'docs'); restore(); document.execCommand('insertHTML', false, `<p><a href="${url}">${esc(f.name)}</a></p>`); toast('Document ajouté'); } catch (err) { toast('Échec de l\'envoi : ' + err.message, true); }
      e.target.value = '';
    });
    return { get: () => (src.hidden ? area.innerHTML : src.value).trim() };
  }

  // ---------- Définition des rubriques ----------
  const SECTIONS = { ligue: 'La Ligue', sportif: 'Compétitions (règlements)', commissions: 'Commissions', formations: 'Formations', 'golf-pour-tous': 'Golf Pour Tous', 'golf-tour': 'Golf Tour', 'golf-entreprise': 'Golf Entreprise', legal: 'Mentions légales' };
  const DEPTS = ['', 'Cher', 'Eure-et-Loir', 'Indre', 'Indre-et-Loire', 'Loir-et-Cher', 'Loiret'];
  const STATUSES = ['', 'En attente de départs', 'Départs disponibles', 'En attente de résultats', 'Résultats disponibles', 'Annulée', 'Reportée'];

  const TYPES = {
    posts: { table: 'golfcentre_posts', label: 'Actualités', one: 'une actualité', order: ['published_at', false], search: ['title', 'category'],
      cols: [['cover_url', '', 'img'], ['title', 'Titre'], ['category', 'Catégorie'], ['published_at', 'Date', 'date'], ['published', 'Statut', 'pub'], ['featured', 'À la une', 'bool']],
      fields: [
        { k: 'title', l: 'Titre', t: 'text', req: 1, full: 1 },
        { k: 'slug', l: 'Adresse de la page', t: 'slug', from: 'title', hint: 'Générée à partir du titre. Évitez de la modifier une fois publiée.' },
        { k: 'category', l: 'Catégorie', t: 'select', o: ['Compétition', 'Vie de la Ligue', 'Newsletter', 'Jeunes', 'Golf entreprise'] },
        { k: 'published_at', l: 'Date de publication', t: 'date', def: () => new Date().toISOString().slice(0, 10) },
        { k: 'cover_url', l: 'Image de couverture', t: 'image', full: 1 },
        { k: 'excerpt', l: 'Résumé (affiché sur les cartes)', t: 'textarea', full: 1 },
        { k: 'body', l: 'Contenu', t: 'rich', full: 1 },
        { k: 'published', l: 'Publiée sur le site', t: 'bool', def: true },
        { k: 'featured', l: 'Mettre à la une de l\'accueil', t: 'bool' }
      ] },
    events: { table: 'golfcentre_events', label: 'Compétitions', one: 'une compétition', order: ['start_date', false], search: ['title', 'venue', 'category'], filter: 'category',
      cols: [['start_date', 'Date', 'date'], ['title', 'Épreuve'], ['venue', 'Parcours'], ['category', 'Catégorie'], ['status', 'Statut'], ['published', '', 'pub']],
      fields: [
        { k: 'title', l: 'Nom de l\'épreuve', t: 'text', req: 1, full: 1 },
        { k: 'category', l: 'Catégorie', t: 'combo', src: 'category', req: 1 },
        { k: 'venue', l: 'Golf / parcours', t: 'text' },
        { k: 'start_date', l: 'Date de début', t: 'date', req: 1 },
        { k: 'end_date', l: 'Date de fin (si plusieurs jours)', t: 'date' },
        { k: 'format', l: 'Formule de jeu', t: 'text', hint: 'Ex. Simple Stroke Play, Stableford…' },
        { k: 'status', l: 'Statut', t: 'select', o: STATUSES },
        { k: 'link_url', l: 'Lien résultats / départs / inscription', t: 'url', full: 1 },
        { k: 'image_url', l: 'Image (logo du golf ou affiche)', t: 'image', full: 1 },
        { k: 'description', l: 'Informations complémentaires', t: 'textarea', full: 1 },
        { k: 'published', l: 'Visible sur le site', t: 'bool', def: true }
      ] },
    pages: { table: 'golfcentre_pages', label: 'Pages', one: 'une page', order: ['section', true, 'sort'], search: ['title', 'slug'], filter: 'section', key: 'slug',
      cols: [['title', 'Titre'], ['section', 'Rubrique', 'section'], ['sort', 'Ordre'], ['published', '', 'pub']],
      fields: [
        { k: 'title', l: 'Titre', t: 'text', req: 1 },
        { k: 'slug', l: 'Adresse (page.html?p=…)', t: 'slug', from: 'title', lockOnEdit: 1 },
        { k: 'section', l: 'Rubrique', t: 'select', o: Object.keys(SECTIONS), labels: SECTIONS, req: 1 },
        { k: 'sort', l: 'Ordre dans la rubrique', t: 'number', def: 10 },
        { k: 'subtitle', l: 'Sous-titre (bandeau et cartes)', t: 'text', full: 1 },
        { k: 'cover_url', l: 'Image de la carte', t: 'image', full: 1 },
        { k: 'body', l: 'Contenu', t: 'rich', full: 1 },
        { k: 'published', l: 'Publiée', t: 'bool', def: true }
      ] },
    golfs: { table: 'golfcentre_golfs', label: 'Annuaire des golfs', one: 'un golf', order: ['name', true], search: ['name', 'city', 'department'], filter: 'department',
      cols: [['name', 'Nom'], ['city', 'Ville'], ['department', 'Département'], ['category', 'Type'], ['holes', 'Trous']],
      fields: [
        { k: 'name', l: 'Nom', t: 'text', req: 1, full: 1 },
        { k: 'category', l: 'Type', t: 'select', o: ['Golf', 'Compact', 'P & P', 'Practice', 'Entreprise'] },
        { k: 'holes', l: 'Parcours', t: 'select', o: ['', '9 trous', '18 trous', '27 trous', '36 trous', '45 trous'] },
        { k: 'structure', l: 'Structure', t: 'select', o: ['', 'Association', 'Association sans terrain', 'École de Golf', 'Gestion', 'Gestion & Association'] },
        { k: 'department', l: 'Département', t: 'select', o: DEPTS },
        { k: 'address', l: 'Adresse', t: 'text', full: 1 },
        { k: 'city', l: 'Ville', t: 'text' },
        { k: 'phone', l: 'Téléphone', t: 'text' },
        { k: 'email', l: 'E-mail', t: 'text' },
        { k: 'website', l: 'Site internet', t: 'url' },
        { k: 'lat', l: 'Latitude', t: 'number', step: 'any', hint: 'Clic droit sur Google Maps → copier les coordonnées.' },
        { k: 'lng', l: 'Longitude', t: 'number', step: 'any' },
        { k: 'description', l: 'Description', t: 'textarea', full: 1 }
      ] },
    people: { table: 'golfcentre_people', label: 'Équipe', one: 'une personne', order: ['grp', true, 'sort'], search: ['name', 'role'], filter: 'grp',
      cols: [['photo_url', '', 'img'], ['name', 'Nom'], ['role', 'Fonction'], ['grp', 'Groupe'], ['sort', 'Ordre']],
      fields: [
        { k: 'name', l: 'Prénom et nom', t: 'text', req: 1 },
        { k: 'grp', l: 'Groupe', t: 'select', o: ['Bureau directeur', 'Comité directeur', 'Permanents'], req: 1 },
        { k: 'role', l: 'Fonction', t: 'text', full: 1 },
        { k: 'email', l: 'E-mail', t: 'text' },
        { k: 'phone', l: 'Téléphone', t: 'text' },
        { k: 'photo_url', l: 'Photo', t: 'image', full: 1 },
        { k: 'sort', l: 'Ordre d\'affichage', t: 'number', def: 10 }
      ] },
    partners: { table: 'golfcentre_partners', label: 'Partenaires', one: 'un partenaire', order: ['sort', true], search: ['name'],
      cols: [['logo_url', '', 'img'], ['name', 'Nom'], ['website', 'Site'], ['sort', 'Ordre']],
      fields: [
        { k: 'name', l: 'Nom', t: 'text', req: 1 },
        { k: 'website', l: 'Site internet', t: 'url' },
        { k: 'logo_url', l: 'Logo', t: 'image', full: 1 },
        { k: 'sort', l: 'Ordre', t: 'number', def: 10 }
      ] },
    documents: { table: 'golfcentre_documents', label: 'Documents', one: 'un document', order: ['sort', true], search: ['title', 'category'],
      cols: [['title', 'Titre'], ['category', 'Catégorie'], ['created_at', 'Ajouté le', 'date']],
      fields: [
        { k: 'title', l: 'Titre', t: 'text', req: 1, full: 1 },
        { k: 'category', l: 'Catégorie', t: 'text', def: 'Documents' },
        { k: 'sort', l: 'Ordre', t: 'number', def: 10 },
        { k: 'file_url', l: 'Fichier (PDF, Word…)', t: 'file', req: 1, full: 1 }
      ] }
  };

  const NAV = [
    ['dashboard', 'Tableau de bord'], ['posts', 'Actualités'], ['events', 'Compétitions'], ['pages', 'Pages'], ['golfs', 'Annuaire des golfs'],
    ['people', 'Équipe'], ['partners', 'Partenaires'], ['documents', 'Documents'], ['gallery', 'Photothèque'], ['messages', 'Messages'], ['settings', 'Réglages de l\'accueil']
  ];
  let current = 'dashboard', newMsgs = 0;

  function renderNav() {
    $('#side-nav').innerHTML = NAV.map(([k, l]) => `<button type="button" data-k="${k}" aria-current="${k === current}">${l}${k === 'messages' && newMsgs ? `<span class="badge">${newMsgs}</span>` : ''}</button>`).join('');
  }
  $('#side-nav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.k); });
  function go(k) { current = k; renderNav(); $('#main').focus(); location.hash = k; (VIEWS[k] || listView)(k); }

  // ---------- Vues ----------
  const VIEWS = {
    async dashboard() {
      const m = $('#main');
      const cnt = async (t, f) => { let q = sb.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); return (await q).count || 0; };
      const today = new Date().toISOString().slice(0, 10);
      const [p, e, up, g, msg] = await Promise.all([cnt('golfcentre_posts'), cnt('golfcentre_events'), cnt('golfcentre_events', (q) => q.gte('start_date', today)), cnt('golfcentre_golfs'), cnt('golfcentre_messages', (q) => q.eq('status', 'nouveau'))]);
      m.innerHTML = `<div class="m-head"><div><h1>Bonjour 👋</h1><p>Tout le contenu du site se gère ici. Les modifications sont visibles immédiatement.</p></div><a class="a-btn" href="../index.html" target="_blank" rel="noopener">Voir le site</a></div>
        <div class="stats">
          <div class="card stat"><b>${p}</b><span>actualités</span></div>
          <div class="card stat"><b>${up}</b><span>compétitions à venir (${e} au total)</span></div>
          <div class="card stat"><b>${g}</b><span>golfs dans l'annuaire</span></div>
          <div class="card stat"><b>${msg}</b><span>nouveaux messages</span></div>
        </div>
        <div class="card" style="padding:20px">
          <h2>Raccourcis</h2>
          <div class="m-tools">
            <button class="a-btn primary" data-new="posts">Publier une actualité</button>
            <button class="a-btn" data-new="events">Ajouter une compétition</button>
            <button class="a-btn" data-go="gallery">Ajouter des photos</button>
            <button class="a-btn" data-go="settings">Modifier l'accueil</button>
          </div>
        </div>`;
      m.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', () => { go(b.dataset.new); setTimeout(() => openEditor(b.dataset.new, null), 50); }));
      m.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    },
    gallery: galleryView,
    messages: messagesView,
    settings: settingsView
  };

  async function listView(k) {
    const T = TYPES[k], m = $('#main');
    m.innerHTML = `<div class="m-head"><div><h1>${T.label}</h1><p id="lv-count"></p></div>
      <div class="m-tools">${T.filter ? `<select id="lv-filter" aria-label="Filtrer"><option value="">Tout</option></select>` : ''}<input type="search" id="lv-q" placeholder="Rechercher…" aria-label="Rechercher"><button class="a-btn primary" id="lv-new">Ajouter ${T.one}</button></div></div>
      <div class="card table-wrap"><table class="list"><thead><tr>${T.cols.map((c) => `<th>${c[1]}</th>`).join('')}</tr></thead><tbody id="lv-body"><tr><td colspan="${T.cols.length}" class="empty">Chargement…</td></tr></tbody></table></div>`;
    let q = sb.from(T.table).select('*').order(T.order[0], { ascending: T.order[1] });
    if (T.order[2]) q = q.order(T.order[2], { ascending: true });
    const { data, error } = await q.limit(2000);
    if (error) { toast(error.message, true); return; }
    const rows = data || [];
    if (T.filter) $('#lv-filter').insertAdjacentHTML('beforeend', [...new Set(rows.map((r) => r[T.filter]).filter(Boolean))].sort().map((v) => `<option value="${esc(v)}">${esc(k === 'pages' ? SECTIONS[v] || v : v)}</option>`).join(''));
    const cell = (r, [key, , type]) => {
      const v = r[key];
      if (type === 'img') return v ? `<img class="thumb" src="${esc(v)}" alt="" loading="lazy">` : '<span class="thumb"></span>';
      if (type === 'date') return esc(fmt(v));
      if (type === 'pub') return v ? '<span class="pill on">En ligne</span>' : '<span class="pill off">Masqué</span>';
      if (type === 'bool') return v ? '<span class="pill">Oui</span>' : '';
      if (type === 'section') return esc(SECTIONS[v] || v);
      return esc(v);
    };
    const draw = () => {
      const s = ($('#lv-q').value || '').toLowerCase(); const f = T.filter ? $('#lv-filter').value : '';
      const list = rows.filter((r) => (!f || r[T.filter] === f) && (!s || T.search.some((c) => String(r[c] || '').toLowerCase().includes(s))));
      $('#lv-count').textContent = `${list.length} élément${list.length > 1 ? 's' : ''}`;
      $('#lv-body').innerHTML = list.map((r) => `<tr data-id="${esc(r[T.key || 'id'])}">${T.cols.map((c) => `<td>${cell(r, c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${T.cols.length}" class="empty">Aucun élément.</td></tr>`;
    };
    $('#lv-q').addEventListener('input', draw); if (T.filter) $('#lv-filter').addEventListener('change', draw);
    $('#lv-body').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) openEditor(k, rows.find((r) => String(r[T.key || 'id']) === tr.dataset.id)); });
    $('#lv-new').addEventListener('click', () => openEditor(k, null));
    draw();
  }

  // ---------- Formulaire d'édition ----------
  let edState = null;
  async function openEditor(k, row) {
    const T = TYPES[k]; const isNew = !row; row = row || {};
    edState = { k, row, isNew, rich: {} };
    $('#ed-title').textContent = isNew ? `Ajouter ${T.one}` : (row.title || row.name || 'Modifier');
    $('#ed-delete').hidden = isNew;
    const form = $('#ed-form'); form.innerHTML = '';
    let combos = {};
    for (const f of T.fields.filter((x) => x.t === 'combo')) {
      const { data } = await sb.from(T.table).select(f.src); combos[f.k] = [...new Set((data || []).map((r) => r[f.src]).filter(Boolean))].sort();
    }
    T.fields.forEach((f) => {
      const id = 'f-' + f.k; const v = row[f.k] ?? (isNew && f.def !== undefined ? (typeof f.def === 'function' ? f.def() : f.def) : '');
      const wrap = document.createElement('div'); if (f.full || f.t === 'rich') wrap.className = 'full';
      let inner = '';
      switch (f.t) {
        case 'textarea': inner = `<textarea id="${id}" rows="4">${esc(v)}</textarea>`; break;
        case 'select': inner = `<select id="${id}">${f.o.map((o) => `<option value="${esc(o)}"${String(v) === o ? ' selected' : ''}>${esc(f.labels ? f.labels[o] : (o || '—'))}</option>`).join('')}${v && !f.o.includes(v) ? `<option selected>${esc(v)}</option>` : ''}</select>`; break;
        case 'combo': inner = `<input id="${id}" list="${id}-l" value="${esc(v)}"><datalist id="${id}-l">${combos[f.k].map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`; break;
        case 'bool': wrap.className = 'full'; inner = `<label class="check"><input type="checkbox" id="${id}"${v ? ' checked' : ''}> ${esc(f.l)}</label>`; break;
        case 'date': inner = `<input type="date" id="${id}" value="${esc(String(v || '').slice(0, 10))}">`; break;
        case 'number': inner = `<input type="number" id="${id}" value="${esc(v)}" step="${f.step || 1}">`; break;
        case 'url': inner = `<input type="url" id="${id}" value="${esc(v)}" placeholder="https://…">`; break;
        case 'image': case 'file': inner = `<div class="imgfield">${f.t === 'image' ? `<div class="prev" style="background-image:url('${esc(v)}')"></div>` : ''}<div class="col"><input id="${id}" value="${esc(v)}" placeholder="Adresse du fichier"><div><input type="file" ${f.t === 'image' ? 'accept="image/*"' : ''} id="${id}-up" hidden><button type="button" class="a-btn sm" data-up="${id}">${f.t === 'image' ? 'Choisir une image' : 'Choisir un fichier'}</button>${v && f.t === 'file' ? ` <a href="${esc(v)}" target="_blank" rel="noopener">Ouvrir</a>` : ''}</div></div></div>`; break;
        case 'rich': inner = `<div id="${id}"></div>`; break;
        case 'slug': inner = `<input id="${id}" value="${esc(v)}"${f.lockOnEdit && !isNew ? ' readonly' : ''}>`; break;
        default: inner = `<input id="${id}" value="${esc(v)}"${f.req ? ' required' : ''}>`;
      }
      wrap.innerHTML = (f.t === 'bool' ? '' : `<label for="${id}">${esc(f.l)}${f.req ? ' *' : ''}</label>`) + inner + (f.hint ? `<div class="hint">${esc(f.hint)}</div>` : '');
      form.appendChild(wrap);
      if (f.t === 'rich') edState.rich[f.k] = richEditor($('#' + id, form), v);
    });
    // slug automatique
    T.fields.filter((f) => f.t === 'slug').forEach((f) => {
      const src = $('#f-' + f.from, form), dst = $('#f-' + f.k, form);
      if (isNew) src.addEventListener('input', () => { if (!dst.dataset.touched) dst.value = slugify(src.value); });
      dst.addEventListener('input', () => (dst.dataset.touched = '1'));
    });
    // téléversement
    form.querySelectorAll('[data-up]').forEach((b) => {
      const id = b.dataset.up, fileInput = $('#' + id + '-up', form);
      b.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0]; if (!file) return;
        b.disabled = true; b.textContent = 'Envoi…';
        try { const url = await upload(file, file.type.startsWith('image/') ? 'uploads' : 'docs'); $('#' + id, form).value = url; const prev = b.closest('.imgfield').querySelector('.prev'); if (prev) prev.style.backgroundImage = `url('${url}')`; toast('Fichier envoyé'); }
        catch (err) { toast('Échec de l\'envoi : ' + err.message, true); }
        b.disabled = false; b.textContent = 'Remplacer';
      });
    });
    $('#editor').hidden = false; $('#drawer-bg').hidden = false;
    setTimeout(() => form.querySelector('input,select,textarea')?.focus(), 30);
  }
  const closeEditor = () => { $('#editor').hidden = true; $('#drawer-bg').hidden = true; edState = null; };
  $('#ed-close').addEventListener('click', closeEditor); $('#ed-cancel').addEventListener('click', closeEditor); $('#drawer-bg').addEventListener('click', closeEditor);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && edState) closeEditor(); });

  $('#ed-form').addEventListener('submit', async (e) => {
    e.preventDefault(); if (!edState) return;
    const { k, row, isNew } = edState; const T = TYPES[k]; const out = {};
    for (const f of T.fields) {
      const el = $('#f-' + f.k);
      let v;
      if (f.t === 'rich') v = edState.rich[f.k].get();
      else if (f.t === 'bool') v = el.checked;
      else if (f.t === 'number') v = el.value === '' ? null : Number(el.value);
      else v = el.value.trim() || null;
      if (f.req && (v === null || v === '')) { toast(`Le champ « ${f.l} » est obligatoire.`, true); el?.focus?.(); return; }
      out[f.k] = v;
    }
    if (k === 'pages' || k === 'posts') out.slug = slugify(out.slug || out.title);
    if (k === 'pages') out.updated_at = new Date().toISOString();
    const btn = $('#ed-save'); btn.disabled = true;
    const key = T.key || 'id';
    const res = isNew ? await sb.from(T.table).insert(out) : await sb.from(T.table).update(out).eq(key, row[key]);
    btn.disabled = false;
    if (res.error) { toast('Enregistrement impossible : ' + res.error.message, true); return; }
    toast('Enregistré'); closeEditor(); go(k);
  });
  $('#ed-delete').addEventListener('click', async () => {
    if (!edState) return; const { k, row } = edState; const T = TYPES[k]; const key = T.key || 'id';
    if (!confirm('Supprimer définitivement cet élément ?')) return;
    const { error } = await sb.from(T.table).delete().eq(key, row[key]);
    if (error) { toast(error.message, true); return; }
    toast('Supprimé'); closeEditor(); go(k);
  });

  // ---------- Photothèque ----------
  async function galleryView() {
    const m = $('#main');
    const { data } = await sb.from('golfcentre_gallery').select('*').order('sort');
    const rows = data || [];
    const albums = [...new Set(rows.map((r) => r.album))];
    const cats = [...new Set(rows.map((r) => r.caption).filter(Boolean))];
    m.innerHTML = `<div class="m-head"><div><h1>Photothèque</h1><p>${rows.length} photos dans ${albums.length} albums.</p></div></div>
      <div class="card" style="padding:20px;margin-bottom:22px">
        <h2>Ajouter des photos</h2>
        <div class="form-grid">
          <div><label for="g-album">Album</label><input id="g-album" list="g-albums" placeholder="Ex. Grand Prix de Touraine 2026"><datalist id="g-albums">${albums.map((a) => `<option value="${esc(a)}">`).join('')}</datalist></div>
          <div><label for="g-cat">Catégorie</label><input id="g-cat" list="g-cats" value="Saison sportive ${new Date().getFullYear()}"><datalist id="g-cats">${cats.map((a) => `<option value="${esc(a)}">`).join('')}</datalist></div>
          <div class="full"><input type="file" id="g-files" accept="image/*" multiple hidden><button class="a-btn primary" id="g-pick" type="button">Choisir les photos</button> <span id="g-prog" class="hint"></span></div>
        </div>
      </div>
      ${albums.map((a) => { const ph = rows.filter((r) => r.album === a); return `<details class="card album-block"><summary><span>${esc(a)}</span><span class="pill">${ph.length} · ${esc(ph[0]?.caption || '')}</span></summary><div class="grid-photos">${ph.map((p) => `<figure><img src="${esc(p.image_url)}" alt="" loading="lazy"><button class="a-btn sm danger" data-del="${p.id}" type="button" aria-label="Supprimer la photo">×</button></figure>`).join('')}</div></details>`; }).join('')}`;
    $('#g-pick').addEventListener('click', () => { if (!$('#g-album').value.trim()) { toast('Indiquez d\'abord le nom de l\'album.', true); $('#g-album').focus(); return; } $('#g-files').click(); });
    $('#g-files').addEventListener('change', async (e) => {
      const files = [...e.target.files]; const album = $('#g-album').value.trim(); const caption = $('#g-cat').value.trim();
      let n = 0; const maxSort = Math.max(0, ...rows.map((r) => r.sort || 0));
      for (const f of files) {
        $('#g-prog').textContent = `Envoi ${n + 1} / ${files.length}…`;
        try { const url = await upload(f, 'gallery'); await sb.from('golfcentre_gallery').insert({ album, caption, image_url: url, sort: maxSort + 1 + n }); n++; } catch (err) { toast(err.message, true); }
      }
      toast(`${n} photo${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}`); galleryView();
    });
    m.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Retirer cette photo de la photothèque ?')) return;
      const { error } = await sb.from('golfcentre_gallery').delete().eq('id', b.dataset.del);
      if (error) toast(error.message, true); else b.closest('figure').remove();
    }));
  }

  // ---------- Messages ----------
  async function messagesView() {
    const m = $('#main');
    const { data } = await sb.from('golfcentre_messages').select('*').order('created_at', { ascending: false });
    const rows = data || [];
    m.innerHTML = `<div class="m-head"><div><h1>Messages</h1><p>Envoyés depuis le formulaire de contact du site.</p></div></div>
      <div class="card">${rows.map((r) => `<article class="msg-item" data-id="${r.id}"><header><div><strong>${esc(r.name)}</strong> · <a href="mailto:${esc(r.email)}?subject=${encodeURIComponent('Re: ' + (r.subject || 'Votre message'))}">${esc(r.email)}</a></div><div><span class="pill ${r.status === 'nouveau' ? 'new' : ''}">${esc(r.status)}</span> <small>${new Date(r.created_at).toLocaleString('fr-FR')}</small></div></header>
        <div><em>${esc(r.subject || '')}</em></div><p>${esc(r.message)}</p>
        <div class="m-tools"><a class="a-btn sm primary" href="mailto:${esc(r.email)}?subject=${encodeURIComponent('Re: ' + (r.subject || 'Votre message'))}">Répondre</a>${r.status !== 'traité' ? `<button class="a-btn sm" data-st="traité">Marquer comme traité</button>` : ''}<button class="a-btn sm danger" data-del>Supprimer</button></div></article>`).join('') || '<p class="empty">Aucun message pour le moment.</p>'}</div>`;
    m.querySelectorAll('.msg-item').forEach((it) => {
      const id = it.dataset.id;
      if (rows.find((r) => r.id === id)?.status === 'nouveau') sb.from('golfcentre_messages').update({ status: 'lu' }).eq('id', id).then(() => {});
      it.querySelector('[data-st]')?.addEventListener('click', async () => { await sb.from('golfcentre_messages').update({ status: 'traité' }).eq('id', id); messagesView(); });
      it.querySelector('[data-del]').addEventListener('click', async () => { if (!confirm('Supprimer ce message ?')) return; await sb.from('golfcentre_messages').delete().eq('id', id); it.remove(); });
    });
    newMsgs = 0; renderNav();
  }

  // ---------- Réglages ----------
  async function settingsView() {
    const m = $('#main');
    const { data } = await sb.from('golfcentre_settings').select('*');
    const S = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
    const h = S.home || {}, c = S.contact || {}, so = S.social || {};
    const paths = h.paths || [];
    const imgField = (id, v, label) => `<div class="full"><label for="${id}">${label}</label><div class="imgfield"><div class="prev" style="background-image:url('${esc(v || '')}')"></div><div class="col"><input id="${id}" value="${esc(v || '')}"><div><input type="file" accept="image/*" hidden id="${id}-up"><button type="button" class="a-btn sm" data-up="${id}">Choisir une image</button></div></div></div></div>`;
    m.innerHTML = `<div class="m-head"><div><h1>Réglages de l'accueil</h1><p>Textes d'ouverture, chemins de jeu, coordonnées et réseaux sociaux.</p></div><button class="a-btn primary" id="s-save">Enregistrer les réglages</button></div>
      <div class="settings-grid">
        <section class="card"><h2>Ouverture de l'accueil</h2><div class="form-grid">
          <div class="full"><label for="s-ht">Titre</label><input id="s-ht" value="${esc(h.hero_title || '')}"></div>
          <div class="full"><label for="s-hx">Texte</label><textarea id="s-hx" rows="3">${esc(h.hero_text || '')}</textarea></div>
          ${imgField('s-hi', h.hero_image, 'Photo de fond')}
        </div></section>
        <section class="card"><h2>Quatre façons de jouer</h2>${paths.map((p, i) => `<div class="form-grid" style="padding:14px 0;border-top:1px solid var(--line)">
          <div><label for="p${i}-t">Titre</label><input id="p${i}-t" value="${esc(p.title)}"></div>
          <div><label for="p${i}-p">Étiquette</label><input id="p${i}-p" value="${esc(p.pill || '')}"></div>
          <div class="full"><label for="p${i}-x">Texte</label><input id="p${i}-x" value="${esc(p.text)}"></div>
          <div class="full"><label for="p${i}-h">Lien</label><input id="p${i}-h" value="${esc(p.href)}"></div>
          ${imgField(`p${i}-i`, p.image, 'Photo')}</div>`).join('')}</section>
        <section class="card"><h2>Bandeau licence</h2><div class="form-grid">
          <div><label for="s-lt">Titre</label><input id="s-lt" value="${esc(h.licence_title || '')}"></div>
          <div><label for="s-lu">Lien « Commander »</label><input id="s-lu" value="${esc(h.licence_url || '')}"></div>
          <div class="full"><label for="s-lx">Texte</label><input id="s-lx" value="${esc(h.licence_text || '')}"></div>
          <div class="full"><label for="s-lw">Lien « Pourquoi la licence »</label><input id="s-lw" value="${esc(h.licence_why_url || '')}"></div>
        </div></section>
        <section class="card"><h2>Coordonnées</h2><div class="form-grid">
          <div class="full"><label for="c-n">Nom</label><input id="c-n" value="${esc(c.name || '')}"></div>
          <div class="full"><label for="c-a">Adresse</label><input id="c-a" value="${esc(c.address || '')}"></div>
          <div><label for="c-z">Code postal</label><input id="c-z" value="${esc(c.zip || '')}"></div>
          <div><label for="c-c">Ville</label><input id="c-c" value="${esc(c.city || '')}"></div>
          <div><label for="c-e">E-mail</label><input id="c-e" value="${esc(c.email || '')}"></div>
          <div><label for="c-p">Téléphone</label><input id="c-p" value="${esc(c.phone || '')}"></div>
          <div><label for="c-lat">Latitude (carte)</label><input id="c-lat" type="number" step="any" value="${esc(c.lat ?? '')}"></div>
          <div><label for="c-lng">Longitude (carte)</label><input id="c-lng" type="number" step="any" value="${esc(c.lng ?? '')}"></div>
        </div></section>
        <section class="card"><h2>Réseaux sociaux</h2><div class="form-grid">
          ${['facebook', 'instagram', 'linkedin', 'twitter'].map((k) => `<div><label for="so-${k}">${k[0].toUpperCase() + k.slice(1)}</label><input id="so-${k}" value="${esc(so[k] || '')}"></div>`).join('')}
        </div></section>
      </div>`;
    m.querySelectorAll('[data-up]').forEach((b) => {
      const id = b.dataset.up, fi = $('#' + id + '-up');
      b.addEventListener('click', () => fi.click());
      fi.addEventListener('change', async () => { const f = fi.files[0]; if (!f) return; b.textContent = 'Envoi…'; try { const url = await upload(f); $('#' + id).value = url; b.closest('.imgfield').querySelector('.prev').style.backgroundImage = `url('${url}')`; } catch (err) { toast(err.message, true); } b.textContent = 'Remplacer'; });
    });
    $('#s-save').addEventListener('click', async () => {
      const v = (id) => $('#' + id).value.trim();
      const home = Object.assign({}, h, { hero_title: v('s-ht'), hero_text: v('s-hx'), hero_image: v('s-hi'), licence_title: v('s-lt'), licence_text: v('s-lx'), licence_url: v('s-lu'), licence_why_url: v('s-lw'),
        paths: paths.map((p, i) => ({ title: v(`p${i}-t`), pill: v(`p${i}-p`), text: v(`p${i}-x`), href: v(`p${i}-h`), image: v(`p${i}-i`) })) });
      const contact = Object.assign({}, c, { name: v('c-n'), address: v('c-a'), zip: v('c-z'), city: v('c-c'), email: v('c-e'), phone: v('c-p'), lat: parseFloat(v('c-lat')) || null, lng: parseFloat(v('c-lng')) || null });
      const social = Object.assign({}, so, Object.fromEntries(['facebook', 'instagram', 'linkedin', 'twitter'].map((k) => [k, v('so-' + k)])));
      const { error } = await sb.from('golfcentre_settings').upsert([{ key: 'home', value: home, updated_at: new Date().toISOString() }, { key: 'contact', value: contact, updated_at: new Date().toISOString() }, { key: 'social', value: social, updated_at: new Date().toISOString() }]);
      if (error) toast(error.message, true); else toast('Réglages enregistrés');
    });
  }

  // ---------- Authentification ----------
  async function enter(session) {
    const { data: ok, error } = await sb.rpc('golfcentre_is_admin');
    if (error || !ok) {
      $('#login').hidden = false; $('#shell').hidden = true;
      $('#login-msg').className = 'a-msg err';
      $('#login-msg').textContent = 'Ce compte n\'a pas les droits d\'administration du site.';
      await sb.auth.signOut(); return;
    }
    $('#who').textContent = session.user.email;
    $('#login').hidden = true; $('#shell').hidden = false;
    const { count } = await sb.from('golfcentre_messages').select('*', { count: 'exact', head: true }).eq('status', 'nouveau');
    newMsgs = count || 0;
    const start = location.hash.slice(1);
    go(NAV.some(([k]) => k === start) ? start : 'dashboard');
  }
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#login-msg'); msg.className = 'a-msg'; msg.textContent = 'Connexion…';
    const { data, error } = await sb.auth.signInWithPassword({ email: $('#l-email').value.trim(), password: $('#l-pass').value });
    if (error) { msg.className = 'a-msg err'; msg.textContent = 'E-mail ou mot de passe incorrect.'; return; }
    msg.textContent = ''; enter(data.session);
  });
  $('#forgot').addEventListener('click', async () => {
    const email = $('#l-email').value.trim(); const msg = $('#login-msg');
    if (!email) { msg.className = 'a-msg err'; msg.textContent = 'Saisissez d\'abord votre adresse e-mail.'; $('#l-email').focus(); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    msg.className = 'a-msg ' + (error ? 'err' : 'ok');
    msg.textContent = error ? 'Envoi impossible : ' + error.message : 'Un e-mail de réinitialisation vient de vous être envoyé.';
  });
  $('#reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: $('#r-pass').value });
    const msg = $('#reset-msg'); msg.className = 'a-msg ' + (error ? 'err' : 'ok');
    msg.textContent = error ? error.message : 'Mot de passe enregistré.';
    if (!error) { const { data } = await sb.auth.getSession(); $('#reset-form').hidden = true; $('#login-form').hidden = false; if (data.session) enter(data.session); }
  });
  $('#logout').addEventListener('click', async () => { await sb.auth.signOut(); location.hash = ''; location.reload(); });

  let recovering = false;
  sb.auth.onAuthStateChange((ev) => {
    if (ev === 'PASSWORD_RECOVERY') { recovering = true; $('#login').hidden = false; $('#shell').hidden = true; $('#login-form').hidden = true; $('#reset-form').hidden = false; }
  });
  (async () => {
    const { data } = await sb.auth.getSession();
    if (recovering) return;
    if (data.session && !location.hash.includes('type=recovery')) enter(data.session);
    else $('#login').hidden = false;
  })();
})();
