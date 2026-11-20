#!/usr/bin/env python3
"""Builds index.html from src/: inlines the app code and coastline data into src/template.html.

    python3 tools/build.py          -> index.html loading libraries from lib/ (for your own site)
    python3 tools/build.py --cdn    -> index-cdn.html loading libraries from cdnjs instead
"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(p): return open(os.path.join(ROOT, p), encoding="utf-8").read()
cdn = "--cdn" in sys.argv
libs = {
    "satellite": "https://cdnjs.cloudflare.com/ajax/libs/satellite.js/5.0.0/satellite.min.js" if cdn else "lib/satellite.min.js",
    "three": "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" if cdn else "lib/three.min.js",
    "leaflet": "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" if cdn else "lib/leaflet.min.js",
}
land = json.dumps(json.loads(read("src/land.json")), separators=(",", ":"))
scripts = "\n".join([
    '<!-- satellite.js 5.0.0 (MIT), three.js r128 (MIT), Leaflet 1.9.4 (BSD-2) -->',
    '<script src="%s"></script>' % libs["satellite"],
    '<script src="%s"></script>' % libs["three"],
    '<script src="%s"></script>' % libs["leaflet"],
    "<script>\n" + read("src/pass-engine.js") + "</script>",
    "<script>\n" + read("src/sky3d.js") + "</script>",
    "<script>\n" + read("src/map.js") + "</script>",
    "<script>\n/* Coastlines: Natural Earth 1:110m land (public domain), lon/lat x10 */\nvar LAND_RINGS = " + land + ";\n</script>",
    "<script>\n" + read("src/app.js") + "</script>",
])
html = read("src/template.html")
css = "<style>\n/* Leaflet 1.9.4 */\n" + read("lib/leaflet.css") + "\n</style>\n</head>"
html = html.replace("</head>", css, 1).replace("{{SCRIPTS}}", scripts)
out = os.path.join(ROOT, "index-cdn.html" if cdn else "index.html")
open(out, "w", encoding="utf-8").write(html)
print("wrote", out, len(html), "bytes")
