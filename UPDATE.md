# Daycraft — Water visibility and moonlight fix, 1.9.1

This seven-file update fixes the Water planet version already on your GitHub Pages site:
https://mpb029.github.io/Daycraft/

The update has been prepared and checked, but has not been uploaded or deployed by the assistant.

## Install

1. Extract this ZIP.
2. Open https://github.com/mpb029/Daycraft/upload/main .
3. Upload the seven loose app files below alongside your existing index.html, replacing matching filenames. Upload the extracted files, not the ZIP.
4. Commit the files to main and wait for the GitHub Pages deployment in Actions to finish.
5. Open Daycraft and press Ctrl+Shift+R. Close all Daycraft tabs/windows and reopen the site so the new offline version can activate. For an installed phone app, first reload the site in its browser, then close its Daycraft tabs and the installed app, and reopen it.
6. Settings → Sky & location should show Daycraft 1.9.1. Select Water planet and press Face wave. Press Space or Hide panels to enjoy the full view.

Keep all your other files, including assets, icons and vendor. Your saved tasks, materials, earned items and meadow placements are preserved. Do not clear site data to refresh the update.

- app.mjs
- meadow-night.mjs
- sw.js
- water-cycle.mjs
- water-lighting.mjs
- water-world.mjs
- world-renderer.mjs

UPDATE.md, WATER_FIX_CHECKSUMS.json and verification/ are supporting files; you do not need to upload them.

This is a patch for the existing 1.9.0 Water planet release, not a full first-time installation. The public app.mjs, water-world.mjs, water-cycle.mjs, meadow-night.mjs and sw.js matched that baseline before this patch was made.

## What was wrong

The water vertex shader used `sample` as a variable name. Three.js converts its ShaderMaterial programs to GLSL ES 3.00 for WebGL 2, where `sample` is reserved. The shader therefore failed to compile and the water and tidal wave did not draw, leaving the sky and a rendering warning. The previous shader check compiled the older GLSL language and missed this incompatibility.

The variable is renamed. The corrected shader was compiled and linked as GLSL ES 3.00, matching the browser's language version. The shader error message now names the selected background and logs the compiler details for diagnosis.

## What changes

- Water and the 3D tidal wave draw again.
- Water planet now has its own artistic, gibbous moon above the approaching wave every night. It fades in with dusk and out with daylight, following the real local day/night transition.
- Moonlight creates silver water reflections and illuminates the wave, with a brighter foamy crest. Water remains readable when looking away from the moon. Rain softens the reflection and moon, while retaining enough light to see the water and wave.
- The water-world moon is deliberately cinematic, not Earth's current phase or position. The meadow still uses the real local moon phase, sky position and seasonal sun calculations.
- The default water view includes the moon at night. Look at moon in Settings points to the water-world moon while Water planet is selected.
- The visible wave countdown tells you when the next crest will arrive. Try a wave brings it closer immediately, then carries you over the crest about 96 seconds after pressing the button from calm water.

The normal crest interval remains 20 minutes of active Water planet viewing. Pausing, hiding the tab, choosing another background, Calm mode and device reduced motion hold the wave clock. The camera still follows the exact water surface over the crest and down to calm water. Tasks and progress are unchanged.

## Verification

57 automated checks pass, including the reported evening on 11 October 2026 at 7:12 pm Brisbane time, when the real Earth moon is below the horizon and nearly new. The checks confirm a visible water-world moon in desktop/phone view, lighting aligned with the moon, rain visibility, switching back to the true meadow moon at the same timestamp, 20-minute cadence, pause/preview timing, camera surface clearance, data preservation and offline import paths.

Ten native OpenGL ES GPU frames were generated from the actual shipped geometry, shaders, moon, stars and camera calculations. The visual checks cover daytime, the reported night, the wave approach/crest/descent, phone geometry, rain lighting, looking away from the moon and a full-moon date. They use GLSL ES 3.00. These are graphics checks, not a browser session; full browser interaction, CSS layout and real-phone performance have not been rechecked here. The rain check covers lighting, not raindrop particles.

ZIP integrity and byte comparisons confirm that overlaying these seven files onto the retained 1.9.0 runtime produces the checked 1.9.1 runtime exactly.

To rerun automated checks after merging these files with a complete checkout:

    node --test verification/*.test.mjs

Optional GPU checks require Python 3, Pillow and native EGL/OpenGL ES on Linux. From the complete checkout root:

    node verification/export-water-graphics.mjs
    python3 verification/render-water-graphics.py

They create a temporary water-graphics-check directory with the frames. No browser, server, external API or user data is involved.
