# Myolith website

A static site: no framework, no cookies. Visits are counted with Vercel Web Analytics. The files here are the readable source you edit. A build step makes the version you publish.

Proprietary: see `LICENSE`. All rights reserved.

## Publishing

Publish the `dist/` folder, never this folder. The build minifies the HTML, CSS and JavaScript, scrambles local names, removes comments, puts a copyright notice at the top of each code file, and leaves out the README, LICENSE and build files.

    npm install        # once, installs the minifier (esbuild)
    npm run build      # makes dist/

Run the build again after every change. `dist/` is not committed to Git.

The build also gives the pages clean addresses: `/privacy`, `/terms` and `/support` instead of `privacy.html`, `terms.html` and `support.html`. Each is published as a folder with an `index.html` inside, so this works on any host, and every link in the built site uses the clean form. Keep editing `privacy.html` and `terms.html` as normal here.

- **Upload by hand:** upload the contents of `dist/` to your host.
- **Vercel (recommended):** import the GitHub repo at vercel.com/new. `vercel.json` already sets the build command, the `dist` folder, clean addresses and redirects from the old `.html` addresses, so there is nothing to configure. Then open the project, go to the Analytics tab and click Enable to start counting visits. The analytics script is already in every page; it does nothing until Analytics is enabled, and it only works on Vercel (on your own computer it shows a harmless 404 in the browser console).
- **Another host that builds from GitHub** (Netlify, Cloudflare Pages): set the build command to `npm run build` and the publish folder to `dist`. Vercel Web Analytics will not work there; remove its three lines from each page's `<head>`.
- **GitHub Pages:** it publishes files as they are in the repo, so it would serve the readable source. Use one of the options above instead.

Keep the GitHub repository private. If it is public, anyone can read the unminified source there.

What this does and does not do: browsers must download a site's code to show it, so no website can be made impossible to copy. Minifying makes it slow and tedious to reuse, and the notices make your rights clear. `robots.txt` lets search engines crawl everything and lets AI tools read the pages, so they can recommend Myolith, but keeps AI crawlers out of `/assets/`, where the code and 3D engine live. `llms.txt` tells AI tools not to copy or recreate the site or its technology. Well-behaved tools respect these. Others may not.

## Still to replace

The site address is set to `https://myolith.app` everywhere. These placeholders are left, to fill in once the app has an App Store page.

| Placeholder | Replace with | Where |
|---|---|---|
| `https://apps.apple.com/app/idYOUR-APP-ID` | Your App Store link | `index.html` (the pricing button and the structured data) |
| `YOUR-APP-ID` in the commented `apple-itunes-app` line | Your App Store ID, then uncomment the line | `index.html` |

### Add Apple's App Store badge

The page has three App Store badge spots: under the main button, under the prices and in the closing section. Apple's badge is Apple's own artwork, so it is not included here.

1. Download the official "Download on the App Store" badge (black, SVG) from Apple's App Store marketing resources: https://developer.apple.com/app-store/marketing/guidelines/
2. Save it as `assets/img/app-store-badge.svg`.

Until that file is there, each spot shows a simple "Available only on the App Store" badge with the Apple logo instead. The badges are not links. Apple's rules: do not redraw, recolour or stretch the badge, keep it at least 40 px tall, and leave clear space around it. The page already does this.

## Files

| File | What it is |
|---|---|
| `index.html` | The landing page |
| `privacy.html`, `terms.html` | Legal pages. Drafts: have them checked before launch |
| `support.html` | Help page and contact. Its address, `https://myolith.app/support`, is the Support URL in App Store Connect |
| `assets/css/site.css` | All styling. Colours and shapes match the app's theme |
| `assets/js/site.js` | Sticky header, the 3D figures, hold to commit, pricing reveal |
| `assets/figure.html` | The app's own 3D engine (`Resources/stage.html`) with a small bridge added at the end so the page can drive it |
| `assets/img/` | App icon sizes, figure stills, the social share image |
| `robots.txt`, `sitemap.xml`, `llms.txt` | For search engines and AI tools. `robots.txt` keeps AI crawlers out of `/assets/`; `llms.txt` says the site and its technology may not be copied |
| `build.mjs`, `package.json` | The build step that makes `dist/` |
| `LICENSE` | All rights reserved. Not published to the site |

## Updating the 3D figure

When `stage.html` changes in the app, copy it over `assets/figure.html` and add the bridge block again. The bridge is the last `<style>` and `<script>` pair in the current file, just before `</body>`.

## Notes

- Pricing is in the page's HTML and structured data, but hidden on screen until the visitor holds the commit button. Keyboard and screen-reader users press the button once.
- The page shows no figures outside pricing, as designed. `llms.txt` does list exercise, muscle and plan counts so AI search can answer factual questions. Remove those lines if you would rather it did not.
- Fonts load from Google Fonts. The privacy policy says so. To avoid that request, host the Archivo and Manrope font files yourself and change the two font links in each page.
# Myolith-web
# Myolith-web
# Myolith-web
# Myolith-web
