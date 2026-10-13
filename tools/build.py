#!/usr/bin/env python3
"""Génère les pages HTML du site à partir d'un gabarit commun.
Usage : python3 tools/build.py  (depuis la racine du dépôt)
L'accueil (index.html) et l'admin (admin/index.html) sont écrits à la main."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

HEAD = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — Ligue Centre-Val de Loire de Golf</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#003362">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
{extra_css}<link rel="stylesheet" href="assets/css/site.css">
</head>
<body data-page="{page}"{body_cls}>
<a class="skip" href="#main">Aller au contenu</a>
<header id="site-header"></header>
<main id="main">
{main}
</main>
<footer id="site-footer"></footer>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>
{extra_js}<script src="assets/js/config.js"></script>
<script src="assets/js/core.js"></script>
<script src="assets/js/components.js"></script>
<script src="assets/js/pages.js"></script>
</body>
</html>
"""

LEAFLET_CSS = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">\n'
LEAFLET_JS = '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>\n'

HERO = '<section id="page-hero"></section>'

PAGES = {
    'competitions': dict(title='Compétitions', desc='Le calendrier 2026 des compétitions de la Ligue Centre-Val de Loire de Golf : jeunes, séniors, grands prix, golf entreprise.', main=HERO + """
<section class="section" style="padding-top:48px">
  <div class="wrap">
    <div class="toolbar">
      <div class="seg" role="group" aria-label="Période" id="when">
        <button type="button" data-v="upcoming" aria-pressed="true">À venir</button>
        <button type="button" data-v="past" aria-pressed="false">Passées</button>
        <button type="button" data-v="all" aria-pressed="false">Toute la saison</button>
      </div>
      <div class="field search"><label for="q">Rechercher une épreuve ou un golf</label><input type="search" id="q" placeholder="Ex. Touraine, U12, Coupe…"></div>
    </div>
    <div class="chips" id="cats" role="group" aria-label="Catégories" style="margin-bottom:28px"></div>
    <div class="board" id="comp-board"><div class="board-head" aria-hidden="true"><span>Date</span><span>Épreuve</span><span>Parcours</span><span>Catégorie</span><span>Statut</span></div><div id="comp-rows"><div class="board-empty">Chargement…</div></div></div>
    <p style="margin-top:18px;color:var(--muted);font-size:.92rem">Les résultats et listes de départ s'ouvrent sur la page de l'épreuve.</p>
  </div>
</section>
<section class="section white">
  <div class="wrap">
    <div class="sec-head"><div><h2 data-split>Règlements & Vademecum</h2><p>Les textes qui encadrent les épreuves de Ligue et fédérales.</p></div></div>
    <div class="tiles" id="rules" data-stagger></div>
  </div>
</section>"""),

    'actualites': dict(title='Actualités', desc="Toute l'actualité de la Ligue Centre-Val de Loire de Golf.", main=HERO + """
<section class="section" style="padding-top:48px">
  <div class="wrap">
    <div class="toolbar"><div class="chips" id="news-cats" role="group" aria-label="Filtrer"></div></div>
    <div class="news-grid" id="news-list"></div>
    <div class="more"><button class="btn btn-line" id="news-more" hidden>Afficher plus d'actualités</button></div>
  </div>
</section>"""),

    'article': dict(title='Actualité', desc="Actualité de la Ligue Centre-Val de Loire de Golf.", main="""
<article id="article">
  <header class="article-hero"><div class="wrap ah-inner"><nav class="crumbs" aria-label="Fil d'Ariane"><a href="index.html">Accueil</a><span>/</span><a href="actualites.html">Actualités</a></nav><h1 id="a-title" class="skeleton" style="height:1.2em;width:70%"></h1><div class="meta" id="a-meta"></div></div>
    <div class="article-cover-bg"><div class="article-cover" id="a-cover"></div></div>
  </header>
  <div class="article-body prose" id="a-body"></div>
  <div class="article-body" style="padding-top:0"><div class="share" id="a-share"></div></div>
</article>
<section class="section white"><div class="wrap"><div class="sec-head"><h2>À lire aussi</h2></div><div class="news-grid" id="a-more"></div></div></section>"""),

    'page': dict(title='La Ligue', desc="Ligue Centre-Val de Loire de Golf.", main=HERO + """
<section class="section" style="padding-top:56px">
  <div class="wrap page-layout">
    <aside class="side-nav" id="side-nav" aria-label="Dans cette rubrique"></aside>
    <div class="prose" id="page-body"><div class="skeleton" style="height:400px"></div></div>
  </div>
</section>"""),

    'ligue': dict(title='La Ligue', desc="La Ligue Centre-Val de Loire de Golf : projet, équipe, comités départementaux.", main=HERO + """
<section class="section" style="padding-top:56px">
  <div class="wrap split">
    <div class="prose" id="ligue-intro"></div>
    <div class="stat-row" style="background:var(--navy);border-radius:var(--radius-l);padding:40px;color:#fff" id="ligue-stats"></div>
  </div>
</section>
<section class="section white" id="bureau"><div class="wrap"><div class="sec-head"><div><h2 data-split>Le bureau directeur</h2><p>Les élus qui pilotent la Ligue au quotidien.</p></div></div><div class="people" id="p-bureau" data-stagger></div></div></section>
<section class="section" id="comite"><div class="wrap"><div class="sec-head"><div><h2 data-split>Le comité directeur</h2><p>Chaque commission a son référent.</p></div></div><div class="people" id="p-comite" data-stagger></div></div></section>
<section class="section white" id="permanents"><div class="wrap"><div class="sec-head"><div><h2 data-split>Les permanents</h2><p>L'équipe technique et de développement, à votre écoute.</p></div><a class="btn btn-line" href="contact.html">Nous écrire</a></div><div class="people" id="p-perm" data-stagger></div></div></section>
<section class="section"><div class="wrap"><div class="sec-head"><div><h2 data-split>Mieux connaître la Ligue</h2></div></div><div class="tiles" id="ligue-tiles" data-stagger></div></div></section>"""),

    'commissions': dict(title='Commissions', desc="Les commissions de la Ligue : jeunes, golf scolaire, santé, environnement, femmes, paragolf.", main=HERO + """
<section class="section" style="padding-top:56px"><div class="wrap"><div class="tiles" id="sec-commissions" data-stagger></div></div></section>"""),

    'formations': dict(title='Formations & arbitrage', desc="Arbitrage, OBEC, ASBC et documents utiles.", main=HERO + """
<section class="section" style="padding-top:56px"><div class="wrap"><div class="tiles" id="sec-formations" data-stagger></div></div></section>"""),

    'jouer': dict(title='Jouer', desc="Golf Pour Tous, Golf Tour et Golf Entreprise en Centre-Val de Loire.", main=HERO + """
<section class="section" id="golf-pour-tous" style="padding-top:56px"><div class="wrap"><div class="sec-head"><div><h2 data-split>Golf Pour Tous</h2><p>Un circuit convivial, tous niveaux, dans les golfs de la région.</p></div></div><div class="tiles" id="sec-golf-pour-tous" data-stagger></div></div></section>
<section class="section white" id="golf-tour"><div class="wrap"><div class="sec-head"><div><h2 data-split>Golf Tour</h2><p>Le golf s'installe au cœur des villes pour une découverte grandeur nature.</p></div></div><div class="tiles" id="sec-golf-tour" data-stagger></div></div></section>
<section class="section" id="golf-entreprise"><div class="wrap"><div class="sec-head"><div><h2 data-split>Golf Entreprise</h2><p>Jouer sous les couleurs de son association sportive d'entreprise.</p></div><a class="btn btn-line" href="competitions.html?c=Golf%20Entreprise">Calendrier golf entreprise</a></div><div class="tiles" id="sec-golf-entreprise" data-stagger></div></div></section>"""),

    'golfs': dict(title='Les golfs', desc="Annuaire et carte des golfs, practices et associations sportives de la Ligue Centre-Val de Loire.", extra_css=LEAFLET_CSS, extra_js=LEAFLET_JS, body_cls=' class="solid-header"', main="""
<h1 class="sr-only">Annuaire des golfs</h1>
<div class="golfs-layout" style="margin-top:var(--header-h)">
  <div class="golfs-side">
    <h2 style="font-size:2.2rem;margin-bottom:6px">Annuaire des golfs</h2>
    <p style="color:var(--muted);margin-bottom:18px"><span id="g-count">…</span> structures affiliées. Touchez un golf pour le voir sur la carte.</p>
    <div class="field" style="margin-bottom:12px"><label for="g-q">Rechercher</label><input type="search" id="g-q" placeholder="Nom, ville…"></div>
    <div class="field" style="margin-bottom:12px"><label for="g-dept">Département</label><select id="g-dept"><option value="">Tous les départements</option></select></div>
    <div class="chips" id="g-cat" role="group" aria-label="Type de structure" style="margin-bottom:18px"></div>
    <div id="g-list"></div>
  </div>
  <div id="golfs-map" aria-label="Carte des golfs"></div>
</div>"""),

    'galerie': dict(title='Photothèque', desc="Les albums photo de la Ligue Centre-Val de Loire de Golf.", main=HERO + """
<section class="section" style="padding-top:48px"><div class="wrap">
  <div class="chips" id="alb-cats" role="group" aria-label="Filtrer les albums" style="margin-bottom:28px"></div>
  <div class="albums" id="albums"></div>
</div></section>
<div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-labelledby="lb-title"><div class="lb-top"><h2 id="lb-title"></h2><button class="lb-close" id="lb-close" aria-label="Fermer l'album">×</button></div><div class="lb-grid" id="lb-grid"></div></div>"""),

    'contact': dict(title='Contact', desc="Contacter la Ligue Centre-Val de Loire de Golf.", extra_css=LEAFLET_CSS, extra_js=LEAFLET_JS, main=HERO + """
<section class="section" style="padding-top:56px"><div class="wrap contact-grid">
  <div class="contact-card" id="c-card"></div>
  <div>
    <h2>Écrire à la Ligue</h2>
    <p style="color:var(--muted)">Une question sur une compétition, une licence, un projet dans votre club ? Laissez-nous un message, l'équipe vous répond rapidement.</p>
    <form class="form" id="c-form" novalidate>
      <div class="row">
        <div class="field"><label for="c-name">Nom et prénom</label><input id="c-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="c-email">E-mail</label><input id="c-email" name="email" type="email" required autocomplete="email"></div>
      </div>
      <div class="field"><label for="c-subject">Sujet</label><select id="c-subject" name="subject"><option>Question générale</option><option>Compétitions</option><option>Jeunes / écoles de golf</option><option>Golf entreprise</option><option>Golf Pour Tous / Golf Tour</option><option>Partenariat</option></select></div>
      <div class="field"><label for="c-msg">Message</label><textarea id="c-msg" name="message" rows="7" required maxlength="4000"></textarea></div>
      <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div><button class="btn btn-sky" type="submit">Envoyer le message</button></div>
      <div id="c-feedback" aria-live="polite"></div>
    </form>
  </div>
</div></section>
<section style="height:420px" id="c-map" aria-label="Plan d'accès"></section>"""),

    '404': dict(title='Page introuvable', desc="Page introuvable.", main="""
<section id="page-hero" data-static="1"></section>
<section class="section"><div class="wrap"><p style="font-size:1.2rem">Cette page n'existe pas ou a été déplacée. Reprenez depuis <a href="index.html">l'accueil</a> ou consultez <a href="competitions.html">le calendrier</a>.</p></div></section>"""),
}

for page, cfg in PAGES.items():
    html = HEAD.format(page=page, title=cfg['title'], desc=cfg['desc'], main=cfg['main'].strip('\n'),
                       extra_css=cfg.get('extra_css', ''), extra_js=cfg.get('extra_js', ''), body_cls=cfg.get('body_cls', ''))
    (ROOT / f'{page}.html').write_text(html, encoding='utf-8')
    print('écrit', f'{page}.html')
