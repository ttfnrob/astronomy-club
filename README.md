# Watling Astronomy Club

A small collection of browser-based astronomy tools for the Friday astronomy club at Watling Academy in Milton Keynes. The club runs from October to February; this site is its growing project hub. The landing page includes a date-driven 3D teaching model of Earth, the Sun and Moon.

**Live hub:** https://club.orbitingfrog.com/ (GitHub Pages origin: https://ttfnrob.github.io/astronomy-club/).

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

The landing page is self-contained HTML, CSS and vanilla WebGL JavaScript with no JavaScript libraries or build step. Raleway is an optional typeface from Google Fonts; system font fallbacks are provided. The NASA Earth and Moon texture maps and the hub thumbnail are local files. No analytics, accounts, or user-data collection are included.

### Image credits

- Earth: NASA Blue Marble: Next Generation, January 2004 global base map (equirectangular, downsampled locally to 4096 × 2048 for WebGL compatibility). [NASA Earth Observatory source](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/); [image file](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x5400x2700.jpg).
- Moon: Lunar Reconnaissance Orbiter Wide Angle Camera global colour mosaic (NASA/GSFC/Arizona State University), supplied via NASA Goddard Scientific Visualization Studio's [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/). The mosaic is adapted from the LROC team's Hapke Normalized WAC Mosaic and is optimized for visualization, not scientific measurement; [2K texture file](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg).

The scene is a teaching visualization, not a precision ephemeris. It uses a circular Earth orbit, a fixed 23.44° axial tilt, an average 29.53-day lunar cycle, and simplified lunar orbital geometry. The Moon phase and Earth's seasonal sunlight change with the date control, but orbital distances and apparent sizes are compressed and should not be measured from the illustration.

## Publishing

GitHub Pages should serve the repository root from the `main` branch. There is no build step: Pages publishes the static HTML, SVG and README files as-is. The `.nojekyll` marker disables Jekyll processing, which this static site does not need.
