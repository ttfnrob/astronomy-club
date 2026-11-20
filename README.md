# Watling Astronomy Club

A small collection of browser-based astronomy tools for the Friday astronomy club at Watling Academy in Milton Keynes. The club runs from October to February; this site is its growing project hub.

**Live hub:** https://ttfnrob.github.io/astronomy-club/ (available after GitHub Pages is enabled and its first deployment completes).

## Projects

### Exoplanet Drawing Board

Browse confirmed planetary systems as orbital sketches. Search by star or planet, sort and filter the catalogue, open a system in 3D or 2D, and simulate transits by changing the viewing angle. The app includes A4 print layouts for a board sheet and an individual system sheet.

The catalogue is embedded in the page as a dated snapshot, so browsing does not call a live astronomy API. Its source is the [Extrasolar Planets Encyclopaedia (exoplanet.eu)](https://exoplanet.eu/); the current snapshot is dated 10 November 2026. The drawings are illustrative, not to scale: planet sizes are enlarged and orbital distances compressed. Orbit phases are arbitrary and do not show where planets are now. The original standalone edition remains at [orbitingfrog.com/exoplanets](https://orbitingfrog.com/exoplanets).

## Run locally

This is a static site with no build step or server-side code. Open `index.html` directly, or serve the repository root with any static HTTP server, for example:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000/astronomy-club/` if serving the parent directory, or `http://localhost:8000/` if serving this repository itself. The Exoplanet Drawing Board is under `tools/exoplanet-drawing-board/`.

The main app is self-contained HTML, CSS and JavaScript. It loads two optional typefaces from Google Fonts; system font fallbacks are provided. The hub and thumbnail are local files. No analytics, accounts, or user-data collection are included.

## Publishing

GitHub Actions deploys the contents of the repository root to GitHub Pages when commits are pushed to `main`. The workflow is in `.github/workflows/pages.yml`.
