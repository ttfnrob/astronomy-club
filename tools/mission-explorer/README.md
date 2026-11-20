# Mission Explorer

A general-purpose, step-by-step 3D explorer for seven space missions: BepiColombo, Artemis II, Apollo 11, Apollo 13, Voyager 1, Voyager 2, and Beagle 2. The app opens on the mission picker; select a story to move through its chapters alongside an animated 3D trajectory, then drag/pinch/scroll to explore and open chapter photos for a larger view. The standalone club page is `index.html`.

## Data and limitations

Mission trajectories and close-approach positions for BepiColombo, Artemis II, Voyager 1, Voyager 2, and Mars Express are snapshots from NASA JPL Horizons embedded in the page. BepiColombo's path after 20 November 2026 is a Horizons prediction based on the plan published at that time. Apollo 11 and Apollo 13 are gravity-model reconstructions based on published burns and altitudes, not flight telemetry. Beagle 2's final descent is modelled by coasting Mars Express's pre-release path. Planet surfaces are generated illustrations; distances and sizes are schematic. These are educational replays, not precision navigation products.

Photos and their individual credits are embedded in the app and recorded by key in `src/image-credits.json`. NASA photographs are public domain; ESA photographs carry their listed CC BY-SA 3.0 IGO licence; the Beagle 2 replica image carries CC BY-SA 4.0. Keep the corresponding attribution and share-alike terms if redistributing those images.

## Data flow and privacy

The trajectory JSON, mission stories, and resized JPEGs are bundled locally in `index.html`. Viewing and navigating a mission makes no request to an astronomy API and sends no visitor-entered data. The interface does not use accounts, analytics, cookies, or browser storage. For its 3D renderer it loads Three.js r128 from cdnjs; it also requests fonts from Google Fonts. With those optional network resources unavailable, the 3D view needs an internet connection to load Three.js. The static HTML can be hosted by GitHub Pages and uses no server-side code.

## Source and local rebuild

The supplied source is retained under `src/`: `template.html`, `missions.json`, `image-credits.json`, photos in `img/`, and the original Python builder/data scripts in `tools/`. The checked-in app is self-contained; no data-regeneration script is needed to run it.

From the repository root, rebuild the bundled HTML and update the published app page with:

```sh
cd tools/mission-explorer/src/tools
python3 pack.py
cp ../../dist/flight-paths.html ../../index.html
```

`pack.py` only combines the local template, trajectory JSON, and images. The separate trajectory/photo regeneration scripts in `src/tools/` require Python packages and contact NASA JPL Horizons or Wikimedia Commons; they were not needed for, or run as part of, this static site import. The scripts preserve a dated snapshot unless deliberately rerun.

For a local preview, serve the repository root with any static HTTP server, then visit `/tools/mission-explorer/`. There is no site build step.
