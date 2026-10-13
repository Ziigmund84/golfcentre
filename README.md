# Ligue Centre-Val de Loire de Golf — site internet

Site multi-pages statique (GitHub Pages) dont le contenu est stocké dans Supabase (projet **harmonie-olivet**, tables préfixées `golfcentre_`).

## Pages
| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : trajectoire de balle au scroll, prochains départs, à la une, chemins de jeu, carte, photothèque, licence, partenaires |
| `ligue.html` | Présentation, bureau, comité directeur, permanents |
| `competitions.html` | Calendrier filtrable (catégorie, période, recherche) + règlements |
| `commissions.html`, `formations.html`, `jouer.html` | Rubriques (cartes vers les pages de contenu) |
| `page.html?p=<slug>` | Page de contenu générique |
| `actualites.html`, `article.html?s=<slug>` | Actualités |
| `golfs.html` | Annuaire + carte interactive |
| `galerie.html` | Photothèque par albums |
| `contact.html` | Formulaire (messages visibles dans l'admin) + plan |
| `admin/` | Espace d'administration |

## Administration
`/admin/` — connexion par e-mail et mot de passe Supabase. Seuls les comptes listés dans `golfcentre_admins` ont les droits d'écriture (RLS).

Ajouter un administrateur (SQL Supabase) :
```sql
insert into public.golfcentre_admins (user_id)
select id from auth.users where email = 'adresse@exemple.fr';
```

## Base de données (Supabase)
- `golfcentre_settings` — réglages (accueil, coordonnées, réseaux)
- `golfcentre_pages` — pages de contenu par rubrique
- `golfcentre_posts` — actualités
- `golfcentre_events` — compétitions
- `golfcentre_golfs` — annuaire
- `golfcentre_people` — équipe
- `golfcentre_partners`, `golfcentre_documents`, `golfcentre_gallery`, `golfcentre_messages`
- Stockage : bucket public `golfcentre-media`

## Développement
Les pages intérieures sont générées par `python3 tools/build.py` (puis `python3 tools/stamp.py` pour versionner CSS/JS) à partir d'un gabarit commun ; `index.html` et `admin/` sont écrits à la main.
Bibliothèques chargées depuis CDN : supabase-js, GSAP + ScrollTrigger, Lenis, Leaflet (fonds OpenStreetMap).
