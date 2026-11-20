# ISS pass predictor

A single web page that shows when the International Space Station (NORAD 25544) can be seen passing over Milton Keynes, or anywhere else. It downloads the latest public orbit for the ISS from CelesTrak, works out every pass for the next 10 days in the visitor's browser, and shows them as a table plus a sky chart of the selected pass, with an estimate of how bright each one will be.

Visitors can pick their own spot on an OpenStreetMap map, and explore any pass in 3D: from the side, from where they stand, or from out in space, with the sunlight, the reflected light reaching them, the phase angle between the two and Earth's shadow all drawn in. It is built to answer the two questions every club member asks: why can you see it after sunset, and why does it vanish halfway across the sky?

Nothing runs on a server. Copy the folder to any web host and it works.

## What's in the folder

```
iss-passes/
  index.html            The built page: upload this with lib/
  lib/                  Third-party libraries, served from your own site
    satellite.min.js    satellite.js 5.0.0, SGP4 orbit model (MIT)
    three.min.js        three.js r128, 3D rendering (MIT)
    leaflet.min.js      Leaflet 1.9.4, the map (BSD-2-Clause)
    leaflet.css         Leaflet styles (also inlined into index.html by the build)
  src/                  Source that index.html is built from
    template.html       Layout and styles
    pass-engine.js      Pass prediction, visibility and brightness
    sky3d.js            The 3D view
    map.js              Map picker and place search
    app.js              Page logic, settings and orbit-data loading
    land.json           Coastlines (Natural Earth 1:110m, public domain)
  tools/
    build.py            Rebuilds index.html from src/
    validate.js         Checks the engine against reference predictions (needs Node.js)
    update-tle.sh       Optional cron script to keep a same-site copy of the TLE
  README.md             This file
```

## Quick start

Upload `index.html` and the `lib/` folder to the website, keeping them side by side, and open `index.html`. It must be served over `http://` or `https://`; opening the file from disk also works for testing. The `src/` and `tools/` folders don't need to be on the web server.

To change anything, edit the files in `src/` and rebuild:

```
python3 tools/build.py          # writes index.html, loading libraries from lib/
python3 tools/build.py --cdn    # writes index-cdn.html, loading libraries from cdnjs instead
node tools/validate.js          # after touching pass-engine.js
```

## Adding it to the club website

There are three ways to do it, from simplest to most integrated.

**As its own page.** Put the folder on the site and link to it from the menu, for example `/iss/`. This is the best option: the page controls its own layout and scrolling, and the map and 3D view get the full width on phones.

**Embedded in an existing page.** Use an iframe. The page is long, so give it a generous height:

```html
<iframe src="/iss/index.html" title="ISS passes over Milton Keynes"
        style="width:100%; height:2600px; border:0" loading="lazy"
        allow="geolocation"></iframe>
```

The `allow="geolocation"` attribute is only needed if you want the "Use my location" button to work inside the frame.

**Restyled to match the site.** All colours are CSS variables at the top of `index.html` (`--bg`, `--ink`, `--sun-line` and so on), with a separate set for dark mode. Change those and the font link to match the club's look. Adding `data-theme="light"` or `data-theme="dark"` to the `<html>` tag forces one theme instead of following the visitor's device.

## Settings by URL

Any default can be set in the link, so different pages can show different presets without editing code. A visitor's own changes are saved in their browser and take priority on their next visit; "Reset to defaults" goes back to the values in the URL.

| Parameter | Meaning | Default |
|---|---|---|
| `name` | Place name shown in the heading | Milton Keynes |
| `lat`, `lon` | Latitude and longitude in degrees (east positive) | 52.0406, −0.7594 |
| `alt` | Height above sea level in metres | 90 |
| `minEl` | Minimum elevation a pass must reach, degrees | 20 |
| `minSecs` | Seconds it must spend above `minEl` while visible | 60 |
| `sun` | Sun must be below this altitude (−0.833 sunset, −6 civil, −12 nautical, −18 dark, 90 any time) | −6 |
| `lit` | Only count the ISS while it is sunlit (`1` or `0`) | 1 |
| `mag` | Faintest magnitude to list, e.g. `-2` (leave out for any) | any |
| `days` | Days ahead to predict (1 to 20) | 10 |
| `cutoff` | Ignore the track below this elevation, degrees | 10 |
| `haze` | Dim low passes for atmospheric extinction (`1` or `0`) | 0 |
| `tz` | `Europe/London`, `UTC` or `device` | Europe/London |
| `all` | Also list visible passes that miss the filters | 0 |

Example: `index.html?minEl=30&mag=-2` lists only high, bright passes.

### A preset for Friday club sessions

Club runs 3:30 to 4:30pm. From late November to early January the Sun sets in Milton Keynes at about 3:55 to 4:05pm and civil twilight ends around 4:35pm, so with the default "Sun 6° below the horizon" rule almost nothing will ever fall inside a session. A bright ISS pass (magnitude −2 or brighter) is easy to see in the sky just after sunset, though. For a club-time view, link to:

```
index.html?sun=-0.833&mag=-2
```

That lists passes after sunset that are bright enough to stand out in twilight. The ISS orbit can only be predicted reliably about a week or two ahead, so this is a "check on the Monday" tool rather than a term planner.

## Changing the defaults in code

Near the top of `src/app.js` there is a `CONFIG` block (rebuild after editing it, or edit the same block in the built `index.html` for a quick change):

```js
var CONFIG = {
  tleSources: [ "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE" ],
  refetchAfterHours: 2,
  defaults: { name:"Milton Keynes", lat:52.0406, lon:-0.7594, alt:90, minEl:20, minSecs:60,
              sunLimit:-6, requireLit:true, maxMag:null, days:10, cutoff:10,
              extinction:false, tz:"Europe/London", showAll:false }
};
```

Edit `defaults` to change what every visitor sees first.

## Where the orbit data comes from

The page needs a two-line element set (TLE) for the ISS. When it loads it tries, in order:

1. Each URL in `CONFIG.tleSources`. By default this is CelesTrak's public GP feed, which allows cross-origin requests from browsers.
2. The last TLE this browser downloaded, saved in local storage.
3. A built-in TLE (epoch 19 November 2026), so the page always shows something.

Visitors can also paste any TLE into the "Use your own TLE" box. The "Orbit data" section always says which source is in use and how old it is, and warns once the data is more than a week old.

Each browser retries orbit-data downloads at most once every two hours, even when a previous request failed. **Check for newer orbit data** lets the visitor retry immediately. A successfully downloaded TLE is reused from local storage. The ISS elements are only updated a few times a day, so this avoids needless repeat traffic when someone reloads the page offline or while CelesTrak is unavailable.

**Optional: a same-site copy.** If the site gets a lot of visitors, or you want it to keep working when CelesTrak is down, run `tools/update-tle.sh` from cron on the web server. It downloads the TLE to `data/iss.tle` every few hours and only replaces the file if the download really contains an ISS element set. Then put `"data/iss.tle"` first in `CONFIG.tleSources`; CelesTrak stays as the fallback.

```
17 */4 * * *  /var/www/iss-passes/tools/update-tle.sh
```

## Choosing a place on the map

"Change place" next to the location in the heading opens the location panel. Visitors can search for a town, school or postcode, click or tap the map, or drag the pin; the passes, sky chart and 3D view all update straight away. When someone clicks the map, the page looks up the name of the spot so the heading reads "Seen from Moulsoe" rather than a pair of coordinates. Typing a latitude and longitude still works, and moves the pin.

The map uses OpenStreetMap's standard tiles and place search uses OpenStreetMap's Nominatim service. Those external requests happen only after someone opens the location panel. Both services have usage policies, and the page is written to stay within them:

- The map and its tiles only load when someone opens the location panel, not on every page view.
- The © OpenStreetMap contributors credit stays on the map, as the licence requires.
- Search runs only when someone presses Search or Enter (never as they type), and the page sends at most one Nominatim request a second.

That is fine for a club website. If the site ever gets heavy traffic, switch the tile URL in `src/map.js` to a commercial or self-hosted tile provider and point the search at your own Nominatim or a paid geocoder.

## The 3D view

Below the pass summary is a 3D model of the selected pass, built with three.js. It is drawn to scale in kilometres, except that the ISS is made far bigger than life so it can be seen, and the Sun is placed much closer than it really is. There are three viewpoints:

- **From the side** looks along the edge of the Earth, at right angles to the sunlight. It shows the observer on their local horizon, the ISS about 400 km up, the sunlight arriving from below the observer's horizon, and the orange ray and white dashed line meeting at the ISS with the phase angle marked between them. This is the view that makes "the Sun has set for you but not for the ISS" obvious.
- **Where you stand** is the naked-eye view: the sky with a twilight glow towards the Sun's direction, compass points on the horizon, and the ISS as a point of light whose size follows its estimated brightness. It goes grey when the ISS enters Earth's shadow.
- **Whole Earth** shows the day and night sides, coastlines, the ISS orbit and Earth's shadow as a dark tube stretching away from the Sun, so you can see the orbit pass into it.

Drag to turn the view, scroll or pinch to zoom, and use the slider or "Play the pass" (20 times real speed) to move through the pass. Alongside, a panel gives the live numbers at that moment (where to look, distance, the Sun's altitude for you, how much sunlight reaches the ISS, phase angle and brightness) and a plain-English explanation of why it looks the way it does at that instant.

The ISS model's solar arrays always face the Sun, as the real ones do. That is the key to the brightness: when the phase angle is small the sunlight comes from behind you and you see the lit faces of the arrays; when it is large you see mostly their backs.

If the browser can't run WebGL, the 3D section says so and the rest of the page works as normal.

## How the predictions work

**Orbit.** Positions come from SGP4, the standard model for TLEs, via satellite.js. The engine steps through the prediction window every 30 seconds to find each time the ISS rises above the horizon, then traces that pass in 2-second steps, working out elevation, azimuth and range from the observer.

**Visibility.** At each step it checks two things. First, whether the ISS is in sunlight, using a conical model of Earth's shadow (umbra and penumbra) with a low-precision solar position; it counts as lit when more than half the Sun's disc is visible from the station. Second, whether the observer's sky is dark enough, from the Sun's altitude at the observer. The visible part of a pass is the stretch that meets both, above the cut-off elevation (10° by default, the usual convention). "Appears" and "Disappears" are the ends of that stretch, so a pass can disappear high in the sky when the ISS enters Earth's shadow; the page says so when it happens.

**Filters.** A pass is listed when, while visible, it spends at least `minSecs` above `minEl`, and its peak brightness meets the magnitude limit if one is set.

**Brightness.** The estimate uses

```
m = −1.74 + 5 log10(range / 1000 km) + 0.0132 × (phase angle − 90°)
```

where the phase angle is the Sun to ISS to observer angle. It is then dimmed by the lit fraction when the ISS is in penumbra, and by 0.2 magnitudes per airmass if haze dimming is switched on. The two constants were fitted to published Heavens-Above predictions for the same passes; a textbook diffuse-sphere model was tried first but was up to 1.2 magnitudes too faint at large phase angles, because the solar arrays scatter more light forwards than a sphere would. The table shows the brightest point of the visible stretch.

**Sky chart.** The chart is drawn as you see the sky lying on your back with your head to the north: north at the top, east on the left, the zenith in the centre. Rings mark 30° and 60° elevation, and a dashed ring marks the minimum elevation filter. The thick amber line is the part of the track you can see, with a tick for each minute; the dotted line is the ISS in shadow or in daylight. An open circle marks where it appears, a filled circle its highest point, and a cross where it disappears. While a pass is happening, a pulsing dot shows where the ISS is right now.

## Accuracy

`node tools/validate.js` compares the engine with Heavens-Above for Milton Keynes over 20 to 29 November 2026, using the same TLE. All 19 visible passes match: start, highest and end times within 3 seconds, highest elevation within 1.3°, and brightness within 0.25 magnitudes.

In practice the age of the TLE matters more than the model. The ISS drifts by a second or two a day against its predicted track, more after a reboost, so predictions a week out can be a few seconds to a minute off. The page always uses the newest data it can get.

## Limitations

- Brightness is an estimate. Real passes vary with the station's attitude, and brief flashes from the solar arrays are not modelled.
- Atmospheric refraction is ignored. It only matters within a few degrees of the horizon, below the default cut-off.
- The engine works for any satellite TLE, but the brightness constants are specific to the ISS, and the page rejects TLEs for other objects.
- Predictions are only as good as the TLE, so treat anything more than about two weeks out as approximate.

## Privacy

There are no cookies, accounts or analytics. The page stores the visitor's settings and the last downloaded TLE in their browser's local storage, and nothing is sent to the club's server. The visitor's browser does contact some outside services:

- CelesTrak, for the orbit data, on every visit (at most every two hours).
- OpenStreetMap's tile servers and Nominatim, only when someone opens the location panel. A search sends what they typed; clicking the map sends the coordinates of that spot.

The page uses system fonts and bundles its JavaScript libraries locally. The location map and place search are optional: visitors can always type coordinates instead. The static club site does not run `tools/update-tle.sh`; orbit data comes from CelesTrak when reachable, the last locally saved copy, or the built-in fallback.

## Credits and licences

- Orbit data from CelesTrak (celestrak.org), maintained by Dr T.S. Kelso.
- SGP4 implementation: satellite.js by Shashwat Kandadai and contributors, MIT licence (header kept in `lib/satellite.min.js`).
- 3D rendering: three.js r128, MIT licence.
- Map: Leaflet 1.9.4 by Volodymyr Agafonkin and contributors, BSD-2-Clause licence.
- Map data and place search © OpenStreetMap contributors, Open Database Licence; tiles and Nominatim provided by the OpenStreetMap Foundation.
- Coastlines in the 3D view: Natural Earth 1:110m land, public domain.
- Reference passes for validation from Heavens-Above (heavens-above.com).
