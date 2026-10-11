# Daycraft meadow update — 1.7.0

Prepared for https://github.com/mpb029/Daycraft and its existing GitHub Pages site.

## Install this update

1. Extract the ZIP on your computer.
2. Open https://github.com/mpb029/Daycraft/upload/main .
3. Upload all 11 app files listed below at the repository’s top level, alongside the existing index.html. Replace the matching filenames. They are the loose .mjs, .js, .html and .css files in this ZIP. Upload the extracted files, not the ZIP itself.
4. Commit to main. Keep the current GitHub Pages settings and the existing assets, icons and vendor folders.
5. After the Pages deployment finishes, reload Daycraft once to download the update. Then close all Daycraft tabs/windows and reopen https://mpb029.github.io/Daycraft/ to activate the new offline version. If you installed Daycraft on your phone, close and reopen that app too.

The UPDATE.md, MEADOW_UPDATE_CHECKSUMS.json and verification folder are supporting information. Uploading them is optional; they are not needed to run the app. The verification tests use the existing model and vendor folders from your repository.

## What changed

- The 3D meadow fills the entire screen behind every section.
- Today, Tasks, Collection, Progress and Settings occupy a floating panel. On phones, the panel sits in the lower part of the screen so the landscape remains visible.
- Space toggles the panels when you are not typing or using a focused control. The Show/Hide panels button works with touch or a mouse. Escape restores hidden panels. Hiding panels does not recreate the meadow, discard an unfinished form, or reset panel scrolling.
- Distant 3D hot-air balloons drift past with quiet gaps between passages.
- Small leaves pass in occasional groups when the breeze is on.
- Rain is optional and saved in your preferences. It adds falling rain, softer sunlight and an overcast sky. Turn it off to return to the selected meadow’s normal light. There is no rain audio.
- Calm mode and the device’s reduced-motion preference stop scenery animation. Rain still changes the light in still mode. Effects pause while arranging an item and when the tab is hidden.
- Camera dragging, zoom, placement, rotation, inventory, task completion and backup import/export remain available. Your current local saved progress uses the same storage key and schema, with a backwards-compatible optional rain setting.
- The startup screen now explains a loading failure rather than leaving an empty page.
- The updated offline cache reloads application files from the network when installing this version, and stays scoped to the Daycraft project.

## App files to upload

- app.mjs
- boot.mjs
- domain.mjs
- index.html
- meadow-atmosphere.mjs
- meadow-layout.css
- meadow-overlay.mjs
- meadow-terrain.mjs
- sw.js
- world-renderer.mjs
- world-view.mjs

## Validation

37 automated checks pass. These cover existing task and world behaviour, app navigation and rain actions, backup compatibility, keyboard and touch-button overlay controls, preservation of form content and scroll position, balloon visibility in desktop and phone camera proportions, leaf timing, rain movement and reduced-motion paths, particle budgets, dependency paths and offline cache isolation.

Actual browser rendering, touch gestures and WebGL performance have not been visually tested in this environment. This package has not been uploaded to GitHub or deployed by the assistant.

To rerun the checks after adding these files to a complete checkout, use a current Node.js version and run:

    node --test verification/*.test.mjs

The site itself needs no Node server, paid hosting, external account or ChatGPT connection. Task data remains in each browser; there is no automatic device syncing. Export a backup from Settings before changing devices or clearing browser data.
