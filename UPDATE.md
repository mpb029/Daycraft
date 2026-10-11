# Daycraft — Giant wave and rapid ascent, 1.9.2

A seven-file update for the Water planet app at https://mpb029.github.io/Daycraft/ .
Works over 1.9.0 or 1.9.1 and includes the previous missing-water and moonlight fix.
The assistant has prepared and checked this update; it has not been uploaded or deployed.

## Install

1. Extract this ZIP.
2. Open https://github.com/mpb029/Daycraft/upload/main .
3. Upload the seven loose app files listed below alongside your existing index.html, replacing matching filenames. Upload extracted files, not the ZIP.
4. Commit to main. Wait for the GitHub Pages deployment in Actions to finish.
5. Reload Daycraft with Ctrl+Shift+R, close all Daycraft tabs/windows and reopen it so the new offline version activates. For an installed phone app, first reload the site in its browser, then close its Daycraft tabs and the installed app, and reopen it.
6. Settings → Sky & location should show Daycraft 1.9.2. Choose Water planet → Face wave. Use Try a wave to preview the passage; its crest arrives about 96 seconds after pressing it from calm water.

Keep your other files and folders, including assets, icons and vendor. Saved tasks, progress, earned items and meadow placements are preserved. Do not clear browser site data to refresh the update.

- app.mjs
- meadow-night.mjs
- sw.js
- water-cycle.mjs
- water-lighting.mjs
- water-world.mjs
- world-renderer.mjs

UPDATE.md, WAVE_RIDE_CHECKSUMS.json and verification/ are supporting files; uploading them is optional.

## The new wave

- Four times taller: the authored wave height increases from 160 to 640 scene metres. The camera reaches about 629 scene metres at the centre of the crest.
- Slow and distant at first, then fast when it approaches. Passage speed rises smoothly to 88 scene metres/second, eleven times the earlier 8.
- A smooth forward draw pulls the viewpoint towards the incoming face. The main climb, from about 10% to 90% of the wave height, takes about four seconds.
- The camera tips upward to keep the looming crest in view, rolls over the top without a sudden change in direction, then descends the broader back into calm water. The horizon has no roll or shake. Dragging still changes where you look.
- Wave position, speed and acceleration are continuous at the approach and departure transitions. The asymmetric surface has a smooth crest instead of a curvature kink.
- During the fast passage, rendering uses each available animation frame rather than the distant scenery's 24-fps limit. Long frame stalls advance at most 0.1 seconds per draw to avoid a large camera jump; very slow devices can therefore take longer to complete the cycle.
- Subtle flowing streaks on the steep face provide visible surface detail during the lift.

The ordinary wave cycle remains 20 minutes of active Water planet viewing. Pause wave, Calm mode, reduced motion and hidden-tab pauses remain available. The preview still advances the distant approach and reaches the crest in about 96 seconds; the following crest is 20 active minutes later.

The nighttime moon, silver reflections and readable wave lighting from 1.9.1 are included. The water-world moon is cinematic; the meadow retains Earth's local moon phase and sky position.

This is an authored cinematic scene, not a fluid-dynamics simulation or a real-wave prediction.

## Verification

58 automated checks pass. They cover the larger crest, visible horizon wall on desktop and phone, approximately four-second main lift, continuous wave speed and acceleration, smooth crest curvature, camera clearance, look-up framing, 20-minute cadence, pause/preview behaviour, moonlight, saved progress and offline imports.

An additional geometry check sampled the actual desktop and phone radial mesh edges throughout the passage. Minimum vertical camera clearance above the triangulated water was approximately 2.77 and 2.74 scene metres respectively.

The actual water, sky and celestial shaders compile and link as GLSL ES 3.00. Twelve native GPU render checks cover day, night, approach, rapid lift, crest, descent, settled water, phone geometry, rain lighting, looking away and the moon. These are graphics checks rather than a browser session. Full browser interaction and real-device frame rates were not verified here. Rain checks cover lighting rather than individual raindrops.

ZIP integrity and byte comparisons confirm that overlaying these seven files onto either retained 1.9.0 or 1.9.1 reproduces the checked 1.9.2 runtime exactly.

To rerun automated checks after merging with a complete checkout:

    node --test verification/*.test.mjs

Optional GPU checks require Python 3, Pillow and native EGL/OpenGL ES on Linux. From the complete checkout root:

    node verification/export-water-graphics.mjs
    python3 verification/render-water-graphics.py

They write temporary frames to water-graphics-check/. No browser, server, external API or user data is involved.
