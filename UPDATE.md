# Daycraft — Gradual horizon wave, 1.9.3

A seven-file update for https://mpb029.github.io/Daycraft/ .
Works over 1.9.0, 1.9.1 or 1.9.2, including the earlier water visibility, moonlight and giant-wave improvements.
This update has been prepared and checked. It has not been uploaded or deployed to GitHub.

## Install

1. Extract this ZIP.
2. Open your Daycraft repository at https://github.com/mpb029/Daycraft . Go to the folder containing your existing index.html.
3. Use Add file → Upload files. Upload the seven loose app files listed below into that same folder, replacing matching filenames. Upload the extracted files, not the ZIP.
4. Commit the changes. Wait for the GitHub Pages deployment in Actions to finish.
5. Reload Daycraft with Ctrl+Shift+R, close all Daycraft tabs/windows and reopen it so the new offline version activates. For an installed phone app, first reload the site in its browser, then close its Daycraft tabs and the installed app, and reopen it.
6. Settings → Sky & location should show Daycraft 1.9.3. Choose Water planet → Face wave.

Keep your other files and folders, including assets, icons and vendor. Saved tasks, progress, earned items and meadow placements are preserved. Do not clear browser site data to refresh the update.

- app.mjs
- meadow-night.mjs
- sw.js
- water-cycle.mjs
- water-lighting.mjs
- water-world.mjs
- world-renderer.mjs

UPDATE.md, HORIZON_WAVE_CHECKSUMS.json and verification/ are supporting files; uploading them is optional.

## What changes

- The wave starts as a small, distant ridge. It travels towards you and grows visibly throughout 20 minutes of active Water planet viewing.
- Distance and apparent height work together: the wall no longer sits almost stationary on the horizon before suddenly arriving.
- The close passage from 1.9.2 is retained: the giant wave rapidly draws the camera up its face, carries it over the crest, then settles it smoothly into calm water. Its main climb still takes about four seconds.
- After passing, the same wave travels away towards the opposite horizon, becoming progressively smaller over the next 20 minutes. Turn around to watch it recede.
- The departing wave and the next incoming wave coexist. The old wave no longer disappears when the countdown starts following the next one. Only two waves are retained at a time.
- Distant wave contrast is preserved in daylight, moonlight and rain. Stars stay behind the expanded ocean, with their appearance and the moon's apparent size unchanged.

Leave the scene running normally to see the full 20-minute approach. Try a wave deliberately skips ahead and reaches the crest in about 96 seconds from calm water. Pause wave, Calm mode, reduced motion and hidden-tab pauses still pause wave time. The 20 minutes are active viewing time; switching away from the water pauses the journey. Long frame stalls retain the previous 0.1-second-per-draw limit, so very slow devices can take longer.

The moonlight, rain option, meadow, task overlays, earned items and saved progress are retained. The water-world moon is cinematic; the meadow keeps Earth's local moon phase and sky position. This is an authored cinematic scene rather than a fluid-dynamics simulation.

## Verification

60 automated checks pass. They cover steady horizon movement and increasing projected height, gradual departure, simultaneous waves, repeat-cycle continuity, smooth position/speed/acceleration, the rapid lift, camera clearance, moonlight, pause/preview behaviour, saved progress and local/offline imports.

A direct comparison against retained 1.9.2 code sampled 97,209 camera poses across three passages and three viewing directions, from 45 seconds before each crest to 45 seconds after it. Camera position and pitch matched exactly. Minimum vertical clearance over the actual triangulated mesh was approximately 2.77 scene metres on desktop and 2.74 on phone geometry.

The actual water, sky and celestial shaders compile and link as GLSL ES 3.00. Twenty native GPU frames cover the incoming and outgoing wave at six distances each, daytime, moonlight, phone geometry, rain lighting, rapid lift, crest and descent. These are graphics checks rather than a browser session. Full browser interaction and real-device frame rates were not verified here. Rain checks cover lighting rather than individual raindrops.

ZIP integrity and byte comparisons confirm that overlaying these seven files onto retained 1.9.0, 1.9.1 or 1.9.2 reproduces the checked 1.9.3 runtime exactly.

To rerun automated checks after merging with a complete checkout:

    node --test verification/*.test.mjs

Optional GPU checks require Python 3, Pillow and native EGL/OpenGL ES on Linux. From the complete checkout root:

    node verification/export-water-graphics.mjs
    python3 verification/render-water-graphics.py

They write temporary frames to water-graphics-check/. No browser, server, external API or user data is involved.
