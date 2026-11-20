# Watling Astronomy Club

A small collection of browser-based astronomy tools for the Friday astronomy club at Watling Academy in Milton Keynes. The club runs from October to February; this site is its growing project hub. The landing page features a date-driven, Sun-centred teaching orrery: Earth circles the Sun with its fixed axial tilt, while the Moon circles Earth.

**Live hub:** https://club.orbitingfrog.com/ (GitHub Pages origin: https://ttfnrob.github.io/astronomy-club/).

## Projects

### Exoplanet Drawing Board

Browse confirmed planetary systems as orbital sketches. Search by star or planet, sort and filter the catalogue, open a system in 3D or 2D, and simulate transits by changing the viewing angle. The app includes A4 print layouts for a board sheet and an individual system sheet.

The catalogue is embedded in the page as a dated snapshot, so browsing does not call a live astronomy API. Its source is the [Extrasolar Planets Encyclopaedia (exoplanet.eu)](https://exoplanet.eu/); the current snapshot is dated 10 November 2026. The drawings are illustrative, not to scale: planet sizes are enlarged and orbital distances compressed. Orbit phases are arbitrary and do not show where planets are now. The original standalone edition remains at [orbitingfrog.com/exoplanets](https://orbitingfrog.com/exoplanets).

### ISS Pass Predictor

The static tool at `tools/iss-passes/` predicts visible ISS passes for Milton Keynes or a place the visitor chooses. It uses SGP4 with current TLE data from CelesTrak, with a bundled fallback, and shows pass times, sky tracks, visibility filters, and estimated brightness. A 3D view explores why a pass can be visible after sunset and disappear in Earth’s shadow, with views from the side, from the observer, and around the whole Earth. The map and place search use OpenStreetMap services only when opened; precise device location is requested only after the visitor presses **Use my location**. Settings and the latest TLE stay in browser local storage. See `tools/iss-passes/README.md` for data, privacy, limitations, and attribution.

### BepiColombo: the long road to Mercury

Follow the ESA/JAXA mission from its scientific motivations and origins through launch, nine planetary flybys and its planned arrival at Mercury. The story advances one chapter at a time; the 3D view follows the spacecraft’s heliocentric trajectory and zooms in on close approaches. Drag to look around, use the step markers or Back/Next to move through the timeline, and open mission photographs for a larger view. The page is under `tools/bepicolombo-journey/`, with a portfolio screenshot at `assets/bepicolombo-journey.png`.

The trajectory and planetary positions are a dated snapshot from [NASA JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), embedded in the page. The path is actual through 20 November 2026; the arrival segment is a Horizons prediction based on the mission plan available on that date. Planet sizes and lighting in the 3D scene are illustrative, not to scale. Milestone dates are plans, not a claim that a future event has already happened. Mission facts and planned milestones are sourced from [ESA’s BepiColombo overview](https://www.esa.int/Science_Exploration/Space_Science/BepiColombo), [science objectives](https://www.esa.int/articles/about-us/directorates/science/bepicolombo/science-objectives) and [mission timeline](https://www.esa.int/media/bepicolombo-timeline). Photographs are credited in the app; ESA images are CC BY-SA 3.0 IGO.

## Run locally

This is a static site with no build step or server-side code. Open `index.html` directly, or serve the repository root with any static HTTP server, for example:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000/astronomy-club/` if serving the parent directory, or `http://localhost:8000/` if serving this repository itself. The Exoplanet Drawing Board is under `tools/exoplanet-drawing-board/`, the ISS Pass Predictor is under `tools/iss-passes/`, and the BepiColombo story is under `tools/bepicolombo-journey/`.

The landing page is self-contained HTML, CSS and vanilla WebGL JavaScript with no JavaScript libraries or build step. It uses system fonts; NASA Earth and Moon textures and screenshots of the actual tool interfaces are bundled locally. There are no analytics, accounts, or server-side data collection. The ISS tool bundles satellite.js, three.js, and Leaflet locally; it contacts CelesTrak for orbit data and OpenStreetMap for optional map tiles and place search. The BepiColombo page embeds its trajectory and photographs and makes no live data/API requests or user-data collection; it loads Three.js from cdnjs for WebGL and optional fonts from Google Fonts.

### Image credits

- Earth: NASA Blue Marble: Next Generation, January 2004 global base map (equirectangular, downsampled locally to 4096 × 2048 for WebGL compatibility). [NASA Earth Observatory source](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/); [image file](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x5400x2700.jpg).
- Moon: Lunar Reconnaissance Orbiter Wide Angle Camera global colour mosaic (NASA/GSFC/Arizona State University), supplied via NASA Goddard Scientific Visualization Studio's [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/). The mosaic is adapted from the LROC team's Hapke Normalized WAC Mosaic and is optimized for visualization, not scientific measurement; [2K texture file](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg).
- BepiColombo photographs: ESA / BepiColombo / MTM, licensed CC BY-SA 3.0 IGO. Credits appear beside each photograph in the mission app.

The scene is a teaching visualization, not a precision ephemeris. It uses a circular, Sun-centred Earth orbit, a fixed 23.44° axial tilt, an average 29.53-day lunar cycle, and simplified lunar orbital geometry. The Moon’s phase and Earth’s seasonal sunlight change with the date control; orbital distances and apparent sizes are schematic, not to scale.

## Publishing

GitHub Pages serves the repository root from the `main` branch. The hub is static and has no site-wide build step; Pages publishes its HTML, images, and local tool assets as-is. The ISS predictor’s standalone page is built from `tools/iss-passes/src/` with `python3 tools/iss-passes/tools/build.py`. The `.nojekyll` marker disables Jekyll processing, which this static site does not need.
