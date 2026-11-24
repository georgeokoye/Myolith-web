# Myolith website

A static site: no build step, no framework, no tracking. Open `index.html` in a browser, or upload the whole folder to any static host.

## Before you publish: three things to replace

Search the folder for each placeholder and replace it everywhere it appears.

| Placeholder | Replace with | Where |
|---|---|---|
| `https://YOUR-DOMAIN.com` | Your real address, for example `https://myolith.app` | `index.html`, `privacy.html`, `terms.html`, `robots.txt`, `sitemap.xml`, `llms.txt` |
| `https://apps.apple.com/app/idYOUR-APP-ID` | Your App Store link | `index.html` (the pricing button and the structured data) |
| `YOUR-APP-ID` in the commented `apple-itunes-app` line | Your App Store ID, then uncomment the line | `index.html` |

### Add Apple's App Store badge

The page has three App Store badge spots: under the main button, under the prices and in the closing section. Apple's badge is Apple's own artwork, so it is not included here.

1. Download the official "Download on the App Store" badge (black, SVG) from Apple's App Store marketing resources: https://developer.apple.com/app-store/marketing/guidelines/
2. Save it as `assets/img/app-store-badge.svg`.

Until that file is there, each spot shows a simple "Available only on the App Store" badge with the Apple logo instead. The badges are not links. Apple's rules: do not redraw, recolour or stretch the badge, keep it at least 40 px tall, and leave clear space around it. The page already does this.

One command does the first one (run it inside this folder, with your own address):

    grep -rl "https://YOUR-DOMAIN.com" . | xargs sed -i '' 's#https://YOUR-DOMAIN.com#https://myolith.app#g'

## Files

| File | What it is |
|---|---|
| `index.html` | The landing page |
| `privacy.html`, `terms.html` | Legal pages. Drafts: have them checked before launch |
| `assets/css/site.css` | All styling. Colours and shapes match the app's theme |
| `assets/js/site.js` | Sticky header, the 3D figures, hold to commit, pricing reveal |
| `assets/figure.html` | The app's own 3D engine (`Resources/stage.html`) with a small bridge added at the end so the page can drive it |
| `assets/img/` | App icon sizes, figure stills, the social share image |
| `robots.txt`, `sitemap.xml`, `llms.txt` | For search engines and AI search |

## Updating the 3D figure

When `stage.html` changes in the app, copy it over `assets/figure.html` and add the bridge block again. The bridge is the last `<style>` and `<script>` pair in the current file, just before `</body>`.

## Notes

- Pricing is in the page's HTML and structured data, but hidden on screen until the visitor holds the commit button. Keyboard and screen-reader users press the button once.
- The page shows no figures outside pricing, as designed. `llms.txt` does list exercise, muscle and plan counts so AI search can answer factual questions. Remove those lines if you would rather it did not.
- Fonts load from Google Fonts. The privacy policy says so. To avoid that request, host the Archivo and Inter font files yourself and change the two font links in each page.
# Myolith-web
# Myolith-web
# Myolith-web
# Myolith-web
