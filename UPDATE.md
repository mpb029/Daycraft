# Daycraft — Forest bus stop, version 1.10.0

Adds the approved forest bus stop as a third 3D background. This package updates an existing Daycraft Water planet installation (1.9.0–1.9.3). It includes the latest long-horizon wave behavior. It has not been uploaded to GitHub or deployed by the assistant.

## Upload to your existing GitHub repository

1. Extract this ZIP on your computer.
2. Open https://github.com/mpb029/Daycraft/upload/main .
3. Upload the loose app files listed below alongside your existing index.html, replacing matching names. Drag in the included assets folder too; it adds assets/forest without replacing your other earned-item assets. Upload the extracted files and folder, not the ZIP.
4. Commit to main. Keep your current GitHub Pages settings, index.html, vendor, icons and other assets. Wait for the Pages deployment to complete in Actions.
5. Open https://mpb029.github.io/Daycraft/ . Reload so the updated offline files can download, then close all Daycraft tabs/windows and reopen the site. If you use the installed phone app, close both its browser tabs and the installed app before reopening. The new textures add about 7 MB to the first download.
6. Choose **Forest bus stop** from the background dropdown above the scene or in Settings. At the bottom of Settings → Sky & location, check for **Daycraft 1.10.0**.

Your saved tasks, materials, earned items and placements are preserved. Do not clear site data to refresh the app. Settings → Export backup can save a separate copy of your progress.

## What the scene does

- Look around a real 3D forest with large textured trunks and roots, layered foliage, a misty road, the bus stop sign and a warm lamp. There are no characters.
- Daylight follows the current time and saved sky location. The lamp fades on at dusk. The wet road reflects the scene; rain creates animated puddle ripples.
- Rain starts on for this scene and has its own saved on/off setting. The meadow and water retain their existing rain preference.
- Drag to look around; scroll or pinch to zoom. **Face bus stop** returns to the opening view. The phone opening view aims slightly towards the lamp and sign so both fit the portrait screen.
- **Space** or **Hide panels** toggles tasks and progress over the scene. Calm mode and reduced motion pause rain movement, foliage sway and puddle animation. The sky still follows real time.
- Selecting Place or Move for an earned item returns to the meadow. All backgrounds share your existing tasks and progress.

This is the interactive 3D adaptation of the approved concept, rather than the concept image used as a flat background. The previews folder contains native renders of the actual scene geometry and materials.

## App files to upload

- app.mjs
- backgrounds.mjs
- domain.mjs
- forest-geometry.mjs
- forest-materials.mjs
- forest-world.mjs
- meadow-layout.css
- meadow-night.mjs
- sw.js
- water-controls.mjs
- water-cycle.mjs
- water-lighting.mjs
- water-world.mjs
- world-renderer.mjs
- world-view.mjs

Also upload the **assets/forest** folder containing bark.png, foliage.png and provenance.json. Keep the folder path exactly as supplied.

UPDATE.md, FOREST_UPDATE_CHECKSUMS.json, previews/ and verification/ are supporting files; uploading them is optional.

## Verification

65 automated checks pass: app task/focus/completion behavior; background and rain selection; saved-state migration; inventory placement; the full wave cycle; phone framing; reflection refresh after zoom; and graphics-resource disposal. Runtime file paths and the scoped offline cache are checked for the GitHub project URL.

The forest shaders compile and render in native OpenGL ES 3.2. Day, night, portrait phone, reverse and upward views were rendered; desktop day/night and phone night were visually inspected. The native rain preview reproduces the existing unlit line material. These are graphics checks, not browser screenshots. A full browser interaction check and measurements on your own phone/computer remain unverified.

The existing wave geometry, wave timing, water lighting, meadow terrain, weather, astronomy and reward-rule source files are byte-identical to version 1.9.3. Mobile forest detail is reduced; reflection textures are capped at 384 pixels on phones and 768 on desktop and refreshed at a lower rate when the view is still. The renderer retains its existing animation frame limit and pauses when hidden. Device frame rate has not been measured.

To rerun the functional checks after applying the update, run `node --test verification/*.test.mjs` from the app folder. The optional native graphics helpers require Linux EGL/GLES, Python with Pillow, and Node. From the app folder, run `node verification/export-forest-graphics.mjs`, then `python3 verification/render-forest-graphics.py`.

After upload, check the version, choose Forest bus stop, toggle rain and panels, drag and zoom, then switch back to Meadow and Water planet. Your tasks and earned items should remain present.
