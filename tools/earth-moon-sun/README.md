# Earth, Moon and Sun

An interactive teaching model for Watling Astronomy Club. Keep the Sun at the centre, scrub through an Earth year, and watch the seasons, northern sunlight and Moon phase change.

## Controls

- Drag the date slider or use the arrow keys while it is focused to change the date.
- Choose **Play through year** to animate, or **Today** to return to the current date.
- The readouts show the approximate Northern Hemisphere season, lunar phase and illumination.

## Model and limits

This is an explanatory, not precision, model. The view is heliocentric: the Sun is fixed at the origin, Earth moves around it on a circular annual path, and the Moon moves around Earth. Earth’s north axis stays fixed in inertial space, tilted 23.44° from the perpendicular to its orbital plane. The shown axis arrow uses the same direction as the textured globe.

The season labels use approximate calendar dates for the equinoxes and solstices. Lunar phase and illumination follow a mean 29.53-day cycle referenced to a known new Moon; the lunar path and its alignment are simplified. Sizes and distances are intentionally schematic, so eclipses, angular sizes, exact event timings, the real orbital eccentricities and lunar inclination are not represented. Do not use the scene for ephemeris or observing predictions.

## Data, privacy and local use

The page is static HTML, CSS and vanilla WebGL, with no libraries, build step, fonts or runtime network requests. NASA Earth and Moon textures are stored locally in `../../assets/textures/`. No visitor data is sent or saved. If WebGL is unavailable, the date and text readouts still work, while the fallback message explains the limitation.

Serve the repository root with any static HTTP server, then visit `/tools/earth-moon-sun/`. The tool has a persistent link back to the club homepage.

## Image credits

- Earth: NASA Blue Marble: Next Generation, January 2004 global base map. Source and adaptation details are in the root project README; image resized locally for WebGL compatibility.
- Moon: Lunar Reconnaissance Orbiter Wide Angle Camera global colour mosaic, NASA/GSFC/Arizona State University, supplied via NASA Goddard Scientific Visualization Studio's [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/). Adapted from the LROC team's Hapke Normalized WAC Mosaic; optimized for visualization, not scientific measurement.
