# Daycraft 1.12.0 — After Hours Video

The video-store background is now an independent shop with a relaxed 80s feel.

- Clear windows look out onto blue sky, leafy hedges, marked parking bays and three period-inspired cars.
- Rain has its own saved on/off setting. It stays outside, with glass droplets and wet asphalt. Calm mode and reduced motion pause it.
- Blue sky is the default. The **Blue sky / Local time** control switches the outside view to the date, time and location saved in Settings.
- Walnut trim, a fluted timber counter, burgundy carpet, cream shelves, teal and pink signs, detailed checkout equipment and a ceiling CRT replace the old chain branding.
- 36 distinct films, 1,026 cases and ten framed theatrical posters. The collection includes Carpenter, Spielberg, Zemeckis and Burton favourites, plus Gremlins, Toys, The Goonies, Labyrinth and more.
- **Windows**, **Posters**, **Shelves**, **TV** and **Store** controls move between useful viewpoints. Drag to look around and pinch or scroll to zoom.
- **Browse 36 films** opens the collection. Select a title for its poster and the available full-resolution VHS scans.

Tasks, earned items, meadow placements, backups, the other backgrounds and the four-trailer reel are retained. Space or Hide panels still reveals the scenery.

## Install this update on your existing GitHub Pages site

The release ZIP contains two upload batches. GitHub's browser uploader accepts up to 100 files at once, so the artwork is uploaded first.

1. Extract the ZIP on your computer.
2. Open `https://github.com/mpb029/Daycraft` at the repository root on `main`.
3. Choose **Add file → Upload files**. Open `01-Artwork` inside the extracted ZIP and drag its **assets** folder into GitHub. Commit these files.
4. Return to the repository root and choose **Add file → Upload files** again. Open `02-App` and drag **everything inside it** into GitHub. Commit these files, replacing files with the same names.
5. Keep the paths intact. The numbered folders themselves and the ZIP file do not belong in the repository. The result must have `app.mjs` and `sw.js` at the root, and film artwork under `assets/video-store/catalog/`.
6. Wait for the repository's Pages deployment to finish, then open `https://mpb029.github.io/Daycraft/?scene=video-store`. If Daycraft shows **Reload update**, finish any open form and select it.
7. Check the visible **1.12.0** badge and the **After Hours Video** background name. No clearing of saved data is required.

With a local Git checkout, merge the contents of both numbered folders into the repository root, commit the changes and push them together. This package is an update to the existing Daycraft repository, not a complete standalone copy.

GitHub upload reference: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## Artwork and performance

The catalogue contains 27 authentic VHS fronts, 28 authentic VHS spines and 36 theatrical posters. Shelf scans use unchanged archive-provided small derivatives. Where an original VHS scan is unavailable, the case uses theatrical artwork and a plain After Hours title label; this is not presented as a verified retail VHS edition. Source wear and collector watermarks are retained. Film dates and VHS edition dates may differ; this is an 80s-inspired shop with an 80s/90s collection.

All source links, edition details and hashes are in `assets/video-store/catalog/catalog.json` and `provenance.json`. Full-resolution scan URLs load only when a film is opened and require an internet connection. Some source posters have limited resolution; the app does not invent detail to claim perfect scans.

The local catalogue images total 5.03 MB. Geometry is combined into 108 drawing batches, with 154,926 vertices. The dry shop renders when needed; rain uses the app's existing 24 fps scenery limit and stops when the page is hidden. These are implementation budgets, not measured frame rates on your devices. Trailers also need an internet connection and may be subject to the provider's embedding rules.

## Verification

- 73 automated checks: task/focus/completion/build/undo flows, backups and placement, all other scenes, app controls, separate store weather and time preferences, geometry budgets, window openings, texture disposal, TV alignment and trailer state, local Pages paths and complete-cache activation.
- Eight native GLES renders using the shipped geometry, shaders and artwork: entrance, portrait phone, shelves, TV, windows, rain, night and posters. Previews are in `previews/`.
- Browser UI layout, live YouTube/Vimeo playback and device frame rate were not exercised in this environment. The supplied previews show the 3D scene without the HTML task overlays.

Run the automated suite:

```sh
node --test verification/*.test.mjs
```

Native rendering checks (Python EGL/OpenGL ES, Pillow and CairoSVG required):

```sh
node verification/export-store-graphics.mjs
python3 verification/render-store-graphics.py
```

The catalogue module and the shop's SVG signs can be rebuilt from the checked-in source manifest:

```sh
node verification/build-store-catalog.mjs
```
