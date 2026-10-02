# MP Doors

The MP Doors website, **Figma edition** (October 2026). Same architecture,
pages and copy as `MP-Doors-Website-Redesign`; the look and layout follow the
Camille Figma design: white ground, Inter throughout, uppercase navigation with
a search field, a "Door Series" panel, series tabs, a sand hero band with a
filter sidebar on the series pages, dropdown options and a dark "Where to buy"
button on product pages, grey FAQ accordions and a black footer.

Deliberate departures from the design, agreed before the build:
- The orange buttons keep the logo orange but use near-black text (7.2:1);
  white on orange would be 2.25:1 and fail WCAG AA.
- No star ratings, customer reviews, social icons or placeholder footer links:
  there is no real content for them yet.
- "Door Series" and the tabs map to the existing categories (Entry Doors,
  Patio Doors, Gliding, Hinged, HVHZ Impact), not to new series names.
- The product button reads "Where to buy", not "Purchase": doors are sold at
  The Home Depot.

Static HTML, no build step, no framework, no package
manager. Static HTML, no build step, no framework, no package
manager. Every page is hand maintained and can be opened, edited and deployed
as it stands.

- 27 pages
- 10 entry door styles, 5 patio doors, across 2 sub categories
- Metadata to `site-v4-metadata-2026-08-27` v3.0: titles, descriptions, robots,
  canonicals, Open Graph, Schema.org in JSON-LD, and Dublin Core
- Sold through The Home Depot; every "Where to buy" link points there

Full detail on structure, copy decisions, image sourcing and metadata is in
[SITE-ARCHITECTURE.txt](SITE-ARCHITECTURE.txt).

---

## Running it locally

The pages must be served over HTTP rather than opened from the filesystem, so
that relative asset paths resolve the way they will in production.

```
python3 -m http.server 8777
```

Then open <http://127.0.0.1:8777/>.

---

## Before the first deploy

Every page carries absolute URLs on `https://www.mpdoors.com`: canonical links,
`og:url`, `og:image`, `twitter:image`, `DC.identifier`, and the `@id`, `url`
and `image` fields inside each JSON-LD graph. 675 of them.

Those are correct for production and wrong anywhere else. A canonical pointing
at another host tells Google the real page lives there, and an `og:image` that
404s renders a blank social card.

Point them at whatever host you are deploying to:

```
python3 set-host.py https://YOURNAME.github.io/REPO --staging
```

`--staging` also swaps in a `robots.txt` that disallows everything, so a
preview build cannot compete with the live site in search.

At cutover, switch back:

```
python3 set-host.py https://www.mpdoors.com --production
```

The script remembers the current host in `.deploy-host`, so it can be run
repeatedly without damage. It reports how many references it changed and
verifies none were left behind.

---

## Structure

```
.
├── index.html                          Homepage
├── entry-doors.html                    Entry landing, 10 styles
├── entry-*.html                        10 entry product pages
├── patio-doors.html                    Patio landing
├── patio-gliding.html                  Gliding sub category
├── patio-hinged.html                   Hinged sub category
├── patio-2-panel-gliding.html          Product
├── gliding-3-4-lite.html               Product
├── patio-full-lite-hinged.html         Product
├── patio-3-4-lite-hinged.html          Product
├── patio-impact-full-lite-hinged.html  Product, HVHZ impact
├── why-composite.html                  Material, HydroShield, certifications
├── real-projects.html                  Filterable installation gallery
├── blog.html                           Index plus six full articles
├── warranty-support.html               Measure, install, care, warranty, FAQ
├── 404.html                            Served automatically by GitHub Pages
├── robots.txt  sitemap.xml  llms.txt
├── set-host.py                         Host switcher, see above
├── SITE-ARCHITECTURE.txt               The full record
└── assets/
    ├── css/     fg.css                 the whole design: tokens, header, Door Series
    │                                   panel, tabs, footer, series and support
    │                                   layouts, and every Site v4 component
    ├── js/      site.js                header, menus, search, rails
    │            fg.js                  option dropdowns, series filters, footer
    │                                   question hand-off to the contact form
    ├── brand/                          wordmark, and mp-icon (the square mark)
    ├── images/                         golden yellow renders, retained
    ├── product/                        product photography by range
    ├── scene/                          lifestyle and cinematic photography
    └── social/                         27 Open Graph cards, 1200 x 630
```

Every page loads `site.js`. Interior pages also keep their own small inline
script, which drives the gallery, the mobile menu (`#burger`, `#menu`) and the
"Reduce animations" toggle (`#motionToggle`). The homepage has no inline script,
so it opts `site.js` into those jobs with `<body data-nav="site">`. Keep those
three IDs if the header or footer markup changes.

The header, mobile menu and footer are identical on every page except for the
Home Depot `utm_campaign`, which names the page. The search index (titles,
descriptions, thumbnails) is the `PAGES` list near the end of `site.js`; add a
row when a page is added.

The only third-party dependency is the Google Fonts stylesheet for Inter.

## Series filters

Each series page lists its doors with `data-type`, `data-glass`, `data-finish`
and `data-width` attributes, read from the option groups on each door's own
page. The sidebar checkboxes filter on them: any value within a group, every
group at once. When a door gains a finish or glass option, update its card on
the series pages as well as its product page.

---

## URLs

The canonicals declare directory URLs, for example
`https://www.mpdoors.com/entry-doors/craftsman/`, while the files on disk are
flat, for example `entry-craftsman.html`.

That is deliberate and it needs one decision at deploy time.

- **On a host with rewrites** (Cloudflare Pages, Netlify, nginx, Apache) map
  each clean URL to its file. The canonicals are then correct as they stand.
- **On GitHub Pages**, which has no rewrite engine, pages are served at their
  `.html` paths. Either accept that and rerun `set-host.py`, having first
  changed the canonicals to match, or restructure each page into its own
  directory as `index.html`.

`SITE-ARCHITECTURE.txt` section 1 carries the full URL map.

---

## Editing

Colours, type scale, radii and spacing are CSS custom properties at the top of
`assets/css/site.css`, used by every page. `interior.css` maps the Site v4
token names (`--washi`, `--sumi`, `--gold` and so on) onto them, so older markup
picks up the new palette. Change values in `site.css` rather than in the rules
below.

Small orange text uses `--sun-ink` (5.9:1 on paper); large orange display text
uses `--sun-lg`; plain `--sun` is for fills and for text on dusk. Text on an
orange fill is always ink, never white (white on the logo orange is 2.3:1).

Stylesheet links carry a `?v=` cache buster. Bump it when you change a
stylesheet, or browsers will keep serving the old one.

Pages display WebP copies of every photograph (`name.webp`, at most 1920px
wide) and, for wide photographs, a half-width `name-NNNw.webp` offered through
`srcset`. The original `.jpg` and `.png` files stay beside them because the
JSON-LD `image` fields and social cards point at the originals. When you add a
photograph, export a WebP next to it and reference the WebP in the page.
