# Daycraft night sky update — 1.8.0

An update for the existing 1.7.0 meadow app in https://github.com/mpb029/Daycraft .
The live site remains https://mpb029.github.io/Daycraft/ . This package has not been uploaded or deployed by the assistant.

## Upload to your existing GitHub repo

1. Download and extract this ZIP.
2. Open https://github.com/mpb029/Daycraft/upload/main .
3. Drag in the 13 loose app/licence files listed below. Put them at the repository root, alongside the existing index.html. Upload the extracted files, not the ZIP. Replace matching filenames. There is no new folder to upload for this update.
4. Commit to main and wait for the GitHub Pages deployment to finish in Actions. Keep your current Pages settings.
5. Open Daycraft and press Ctrl+Shift+R in Firefox on your computer. Then close all Daycraft tabs/windows and reopen the site so the updated offline version can activate. For an installed phone app, first reload the site in that browser, then close all its Daycraft tabs and the installed app, and reopen it.
6. In Settings, open Sky & location. It should say Daycraft 1.8.0. Choose Use my location, or enter coordinates manually. It starts with an approximate Gympie-area location.

Keep the existing assets, icons and vendor folders. Your saved tasks, materials, items and placements use the same browser storage and are preserved. Do not clear site data to refresh the app. Export a backup in Settings whenever you want a separate copy of your progress.

UPDATE.md, SKY_UPDATE_CHECKSUMS.json and verification/ are supporting files and do not need to be uploaded.

## What you will see

- The sun, seasonal dawn/dusk and meadow lighting follow the device’s actual date and time and the saved coordinates. No fixed 6 am/6 pm switch.
- Balloons and blowing leaves disappear at sunset and return during daylight.
- A deep blue, densely starred sky appears gradually through twilight. Moonlight changes with the visible moon; a little ambient light keeps earned items visible on moonless nights.
- Fireflies flitter and glow gently just above the grass in your camera view. Their paths are anchored in the world; turning the camera reveals the grass you are now looking at. They do not populate the entire map or behave like a flat screen overlay.
- The moon uses its current phase, horizon position and bright-limb tilt for the saved location. It can appear during the day, can be below the horizon at night, and is almost invisible around new moon. Local hills may obscure a low moon. Its disc is slightly enlarged for visibility; surface markings and the star pattern are decorative artwork, not a star catalogue or a photographic lunar map.
- Settings → Sky & location includes Sky view, Look at moon and Meadow view. Collection also has a Sky view camera control. Use Space or Hide panels to enjoy the scenery.
- Rain remains optional. It darkens the light, obscures stars and strongly dims the moon. Fireflies are dimmer in rain. This is the rain setting you choose, not a live weather service.
- Calm mode and the device’s reduced-motion preference pause animated movement and twinkling. Fireflies remain as still glows; the actual sky time continues updating. Effects pause while arranging items or when the app is hidden.
- Sky readings update about every 20 seconds, independently of the animation clock. The small on-screen clock uses the device’s local timezone. Task day boundaries still use the timezone selected in preferences.

## Location and offline behaviour

Use my location makes one browser location request when you press the button. The browser may ask permission. It saves coordinates rounded to three decimal places; it does not continuously track you. You can enter coordinates instead, or keep the approximate default. Update the saved location if you travel.

All astronomy calculations run locally in the app, including offline after a complete update has been cached. Daycraft sends no coordinates to an astronomy service. The saved location is included in exported backups. Tasks and settings remain browser-local; separate devices still have separate progress unless you transfer a backup.

## Files to upload

- ASTRONOMY-LICENSE.txt
- app.mjs
- astronomy-engine.mjs
- domain.mjs
- meadow-atmosphere.mjs
- meadow-layout.css
- meadow-night.mjs
- meadow-terrain.mjs
- sky-location.mjs
- sky-time.mjs
- sw.js
- world-renderer.mjs
- world-view.mjs

## Verification

47 automated checks pass. They cover task and world behaviour, backup compatibility, location input and permission errors, date/season/longitude/polar cases, independent published lunar-phase dates, illuminated disc fraction and hemisphere tilt, actual clock changes, night gating, rain and reduced motion, fireflies’ camera bounds and ground clearance, star coordinate transforms, sky camera controls, local dependencies and the scoped offline cache.

The five new/updated shader pairs also compiled and linked using the existing native OpenGL ES compiler. This is a shader check, not a browser visual test. Browser appearance, touch interaction and phone performance have not been visually verified in this environment.

The ZIP has been checked for integrity. Merging its app files onto the saved 1.7.0 runtime reproduces the verified 1.8.0 runtime byte for byte. To run the portable tests in a complete checkout containing these changes:

    node --test verification/*.test.mjs

## Astronomy dependency and independent reference

Astronomy Engine 2.1.19 by Don Cross is bundled as astronomy-engine.mjs under the MIT licence in ASTRONOMY-LICENSE.txt. No CDN, API key, package installation or build step is needed.

- Source: https://github.com/cosinekitty/astronomy
- Pinned commit: 61dc07020aaa6885d2c7f688a4d82beaf6edb9ef
- Original file: source/js/esm/astronomy.js
- Unmodified module SHA-256: 068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7
- Independent phase-date test reference: US Naval Observatory, https://aa.usno.navy.mil/calculated/moon/phases?year=2026 . The four test events are global phase times and contain no user location.
