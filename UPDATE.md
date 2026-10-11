# Daycraft — Water planet and background choices, 1.9.0

A cumulative update for the existing meadow app at https://mpb029.github.io/Daycraft/ .
Works over 1.7.0 or 1.8.0. It includes the previous night-sky update, so there is no need to upload 1.8 first.
This package has not been uploaded or deployed by the assistant.

## Install in your existing GitHub repository

1. Extract this ZIP on your computer.
2. Open https://github.com/mpb029/Daycraft/upload/main .
3. Upload the 17 loose app/licence files listed below at the repository root, alongside the existing index.html. Replace matching filenames. Upload extracted files, not this ZIP; there are no new runtime folders to upload.
4. Commit to main. Keep your current Pages settings and the existing assets, icons and vendor folders. Wait for the Pages deployment to finish in Actions.
5. Open Daycraft and press Ctrl+Shift+R in Firefox. Close all Daycraft tabs/windows and reopen the site to activate the new offline version. If using an installed phone app, first reload the site in its browser, then close its Daycraft tabs and the installed app, and reopen it.
6. Choose Water planet from the new background dropdown above the scene. Settings also has two background cards. The version at the bottom of Sky & location should say Daycraft 1.9.0.

UPDATE.md, BACKGROUND_UPDATE_CHECKSUMS.json and verification/ are supporting files; uploading them is optional.
Saved tasks, materials, earned items and meadow placements are preserved. Do not clear site data to refresh the update. Settings → Export backup makes a separate copy of your progress.

## Water planet

- Gentle, shallow-looking ripples stretch to a hazy horizon in every direction. A huge distant wave crosses the scene as real 3D water geometry.
- The first crest passes after 20 minutes of active viewing of Water planet. Further crests follow every 20 active minutes. Time pauses while a different background is selected, the tab is hidden, the wave is paused, or Calm mode/reduced motion is active. Reloading/reopening the app starts a fresh cycle. No background notification or scheduled service is involved.
- As the wave reaches you, the camera rises with the same surface used to draw the water, drifts over the crest, descends its far side and returns to the gentle water. The eye stays above the surface. The horizon stays level, with a small pitch adjustment and no camera roll or shake.
- Drag to look around; scroll or pinch to change zoom. Face wave returns your gaze to the approaching wave.
- Try a wave brings the distant wave closer over about 24 seconds, then runs the normal approach and ride. The crest arrives about 96 seconds after pressing it from calm water; the following crest is 20 active minutes later. It does not suddenly teleport the wave or camera to the crest.
- Pause wave holds the large wave and ride at their current point; the small ripples keep moving. Resume wave continues from there. Calm mode and device reduced motion pause all scenery movement. Turning these off resumes the held scene.
- The task and progress panels remain over the background. Space and Show/Hide panels work as before. A task, form, or tab change does not restart the wave cycle.
- Water planet follows the same actual day/night sky and saved location as the meadow, with sun/moon highlights on the water and optional rain. Balloons, leaves and meadow fireflies do not appear over the ocean.

The scene is a stylised, cinematic water world inspired by the requested imagery. It is not a fluid-dynamics or tsunami prediction model, and uses no film footage or third-party image assets.

## Meadow and your collection

Meadow remains available from the same selector. Its grass, balloons, leaves, night fireflies, real-time sky and free item placement remain available. Switching backgrounds keeps the saved meadow arrangement and restores its camera view.

Both backgrounds use the same task list, progress and inventory. Earned objects are arranged in the meadow. When you choose Place or Move from Water planet, the meadow opens for placement; Open my meadow in Collection also returns there. The water planet stays clear to the horizon.

Your chosen background and wave on/off preference are saved in this browser and included in backups. The running wave timer and view angles are session state. Different devices still hold separate progress unless you transfer a backup.

## Previous night-sky features included

Seasonal sunrise/sunset, the actual moon phase/position/bright-limb tilt, a decorative star field, moonlight, and meadow fireflies are included. Sky & location starts with an approximate Gympie-area location. Use my location requests a location once when pressed; manual coordinates are also available. Astronomy runs locally and offline after the complete app has been cached. Task day boundaries use the separately selected timezone.

## App files to upload

- ASTRONOMY-LICENSE.txt
- app.mjs
- astronomy-engine.mjs
- backgrounds.mjs
- domain.mjs
- meadow-atmosphere.mjs
- meadow-layout.css
- meadow-night.mjs
- meadow-terrain.mjs
- sky-location.mjs
- sky-time.mjs
- sw.js
- water-controls.mjs
- water-cycle.mjs
- water-world.mjs
- world-renderer.mjs
- world-view.mjs

## Validation

56 automated checks pass. They cover existing task and world behaviour, backups and older settings, background switching and placement return, the 1,200-second wave cadence, pause/preview behaviour, surface gradients checked against finite differences, continuous camera motion and surface clearance, horizon coverage and visibility in desktop/phone aspect ratios, particle/geometry budgets, water mouse/touch controls, night effects and astronomy, local import paths and offline cache isolation.

The actual water and sky shaders compiled and linked in native OpenGL ES. Six native render checks were inspected: calm water, approaching wave, crest, descent, phone aspect ratio and night water. These directly use the app’s geometry, shader code and camera calculations, but do not run the browser UI. Full browser interaction, CSS layout, real phone performance and a complete real-time 20-minute session have not been visually tested here.

The ZIP passed integrity and byte comparisons: overlaying its app files onto either the saved 1.7.0 or 1.8.0 runtime recreates the verified 1.9.0 runtime exactly.

To rerun the portable automated checks after merging with a complete checkout:

    node --test verification/*.test.mjs

## Bundled astronomy licence

Astronomy Engine 2.1.19 by Don Cross remains bundled as astronomy-engine.mjs with its MIT licence in ASTRONOMY-LICENSE.txt.
Source: https://github.com/cosinekitty/astronomy
Pinned commit: 61dc07020aaa6885d2c7f688a4d82beaf6edb9ef
Original module: source/js/esm/astronomy.js
SHA-256: 068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7

No build step, paid host, external API, server or ChatGPT connection is needed to run the site.
