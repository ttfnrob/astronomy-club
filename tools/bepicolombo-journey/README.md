# BepiColombo: the long road to Mercury

A one-page, mobile-friendly 3D mission story for Watling Astronomy Club. Open `index.html` directly, or serve the repository root with a static web server and visit `/tools/bepicolombo-journey/`.

## What it does

- Tells the story in 18 chapters, from Mercury’s scientific puzzles and the mission’s origins to the planned Mercury-orbit arrival and science phase.
- Replays BepiColombo’s flight path in 3D, including the Earth, Venus and six Mercury gravity assists, then zooms in for close approaches.
- Offers chapter markers, Back/Next navigation, drag-to-rotate and pinch/scroll-to-zoom controls; mission photographs open in a larger view.
- Adapts to desktop and mobile layouts. The hub-card preview is `../../assets/bepicolombo-journey.png`.

## Trajectory and dates

Trajectory and planetary positions are a dated snapshot from [NASA JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), embedded in the page. The path is actual through 20 November 2026. The arrival segment is a Horizons prediction based on the mission plan available on that date. Planet sizes and surfaces are illustrative, not to scale. Planned milestones are labelled as plans, not as completed events.

Mission background, science objectives and planned milestone dates are based on [ESA’s BepiColombo overview](https://www.esa.int/Science_Exploration/Space_Science/BepiColombo), [science objectives](https://www.esa.int/articles/about-us/directorates/science/bepicolombo/science-objectives) and [timeline](https://www.esa.int/media/bepicolombo-timeline). The text records the plan published by ESA in 2026; refer to ESA for any later operational updates.

## Assets, attribution and data flow

The page embeds its BepiColombo trajectory data and resized mission photographs; it makes no live astronomy/API requests, stores no user data and uses no analytics. It loads Three.js r128 from cdnjs for the WebGL renderer and optional fonts from Google Fonts; system font fallbacks are provided.

Mission photographs are by ESA / BepiColombo / MTM or the European Space Agency and are licensed CC BY-SA 3.0 IGO. Credits appear beside each photograph in the app. The full-screen image view repeats the photographer/credit and licence. The 3D planetary surfaces are generated illustrations, not photographs.

## Local checks

From the repository root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/tools/bepicolombo-journey/`. No build step is required.
