# Daycraft 1.17.1 — more dynamic Poolrooms water

The Poolrooms surface now has three crossing waves, finer ripples and stronger moving reflections. Light patterns move across the submerged tiles and lower walls, including the opening view. The manta spillway has faster flowing strands, expanding impact rings, a churning landing patch and a small spray of droplets.

The waves stay small: their combined maximum rise is 3.8 cm above the resting waterline. The room and camera positions are unchanged. Calm mode and the device's reduced-motion preference freeze all the effects. The animation clock still pauses when the scene is out of view or the tab is hidden.

## Install

Extract the update ZIP and upload its **contents to the root of `main`** in `mpb029/Daycraft`, replacing matching files and keeping the `verification/` folder. Leave other files in place. This update builds on **v1.17.0**, including Problems and Poolrooms. When Pages finishes, choose **Reload update** if offered and check for **1.17.1** beside the logo.

If you see “Still views · 3D unavailable”, the browser is showing the existing still fallback. The animated effects require the 3D scene. If the scene is paused, check Calm mode and your device’s reduced-motion preference.

## Validation and rendering cost

11 focused checks passed for the wave height and normals, shared animation clock, mobile droplet limit, reflection-buffer reuse and restoration, app/Problems actions, Space overlay and scoped offline updates. The actual GLSL shaders compiled and rendered under OpenGL ES at all three viewpoints and portrait framing. These are native scene checks, not a physical phone/GPU performance benchmark.

The room still uses 28,314 triangles. The droplet spray adds one draw call with 48 points on desktop or 28 on mobile. Reflection and refraction targets continue to be reused until the camera, lens, viewport or scene resources change; the water animation does not trigger fresh captures. No simulation, network assets or new high-resolution textures are added.

Reproduce the focused checks with:
`node --test verification/poolrooms.test.mjs verification/app-smoke.test.mjs verification/pages.test.mjs verification/overlay.test.mjs`

Render the scene preview with:
`node verification/export-poolrooms-graphics.mjs --film`
then
`python3 verification/render-cinema-graphics.py --poolrooms`.
The film has 240 frames at 24 fps: 4 seconds at The bend, then 3 seconds each at Spillway and Under the bridge.

---

# Daycraft 1.17.0 — Problems

**Problems** sits beside Tasks in the main navigation. Use it for work, health or life when you know something is wrong but do not yet know which task will help. It works in all six backgrounds, without ChatGPT, a sign-in or an internet connection after the app has been cached.

1. Choose **Problems → Add problem**. Describe one thing that happened and what you would like to see instead. **Save & choose a first check** saves both answers, even if you choose **Decide later** on the next screen.
2. Write a small check, or adapt a starter: **Observe once**, **Compare two cases**, **Ask someone**, or **Try one change**. Optionally record a prediction and separate observed facts from two possible explanations.
3. Select **Add to Today** if you want to do it as a task. Its task options include **Open linked problem**. A completed check earns material under the existing daily rules; the problem stays open.
4. **Record a finding** compares what happened with what you expected. Keep an inconclusive result, try a different check or **Mark solved** with evidence that your original outcome was reached. Optionally note what will keep it solved. Reopening keeps the history.

Progress shows a count of open and solved problems and your latest finding. The notebook, checks, findings, resolutions and task links are included in Settings → Export backup. Existing v1 and v2 backups remain supported and open without sample records. As with tasks, each device keeps its own copy.

## Install on your GitHub Pages site

This is an update for the existing **v1.16.0** Daycraft repository, including Poolrooms. Extract the ZIP and upload **the files and the verification folder inside it** to the root of `mpb029/Daycraft` on `main`. Replace matching files, leave all other files in place, and commit. Do not upload the ZIP or an enclosing directory. Once Pages has finished, use **Reload update** if offered; confirm **1.17.0** beside the logo and open **Problems**.

## Verification

26 focused automated tests passed for the notebook workflow, migration and backups, task rewards, overlay controls, project-relative offline assets and the Poolrooms baseline. In a browser, a delivery example was entered, an editable starter became a Today task, and its task menu returned to the correct problem to record a finding that challenged the prediction.

---

# Daycraft 1.16.0 — Poolrooms: Beyond the Bend

Extract the update ZIP and upload its **contents to the root of `main`** in `mpb029/Daycraft`, keeping the `assets/` and `verification/` folders in place. Replace matching files, leave all other repository files in place, and commit the upload. This update is built against the existing v1.15.0 app. Do not upload the ZIP itself.

When GitHub Pages finishes publishing, open your ordinary Daycraft bookmark and use **Reload update** if shown. Check for **1.16.0** beside the logo, then choose **Poolrooms** in the background selector. The direct entry link after publishing is https://mpb029.github.io/Daycraft/?scene=poolrooms .

- **The bend**, **Spillway**, and **Under the bridge** take you to three locations in the same windowless 3D scene. Drag to look around, scroll or pinch to zoom, and use **Space** or **Hide panels** to enjoy the room without task overlays.
- The water ripples and the fibreglass manta feeds a small waterfall. Calm mode and reduced motion pause animation. If WebGL 2 is unavailable, the three viewpoints open as stills.
- The scene and its textures are part of the Daycraft offline cache, ready after the update has finished installing online. The existing local data format stays the same.

Developer reproduction: `node --test verification/poolrooms.test.mjs verification/app-smoke.test.mjs verification/overlay.test.mjs verification/pages.test.mjs`. For native graphics, run `node verification/export-poolrooms-graphics.mjs`, then `python3 verification/render-cinema-graphics.py --poolrooms` at the repository root. Regenerate the optional baked light atlas with Blender using the instructions in `verification/bake-poolrooms-light.py`. None of these developer tools is required to use Daycraft.

---

# Daycraft 1.15.0 — textured 90s Macca’s mascots

Ronald, Grimace, Hamburglar and Birdie now use your four uploaded Meshy models. The old procedural characters are completely replaced. All 42,022 source triangles and the original 2048 × 2048 PNG textures are retained. One zero-length Ronald normal was repaired; the geometry has not been simplified.

Ronald sits on a yellow perforated steel bench with a red frame. Grimace occupies the corner banquette. Hamburglar and Birdie stand on small timber mounts among the planted dividers, with foliage cleared around their feet. The restaurant layout, staircase, booths, lighting and other backgrounds retain their existing behaviour.

## Upload to GitHub

This is an update for your existing Daycraft 1.13 or 1.14 repository, not a complete standalone app.

1. Extract `Daycraft_90s_Maccas_Update_v1.15.0.zip`.
2. Open the **Code** tab of **mpb029/Daycraft**, with **main** selected.
3. Choose **Add file → Upload files** and upload the **contents inside** the extracted folder to the repository root, replacing matching files. Include the folders and preserve their structure. Do not upload the ZIP itself or add an extra enclosing folder.
4. Commit and wait for GitHub Pages deployment to finish.
5. Open Daycraft, use **Reload update** if offered, and check **1.15.0** beside the app name.
6. Choose **90s Macca’s**, or open https://mpb029.github.io/Daycraft/?scene=cinema.

Root modules such as `app.mjs`, `maccas-models.mjs` and `maccas-mascots.mjs` sit beside `index.html`. The eight model and texture files belong in **assets/cinema/models/**. Upload that entire folder.

**Stairway**, **Dining room**, **Ronald’s bench** and **Booths** change the viewing position. Drag to look around; scroll or pinch to zoom. Space or Hide panels toggles tasks and progress.

Your tasks, progress, earned items, meadow placements and saved settings retain the existing save format.

## Rendering and verification

The character meshes total **42,022 triangles**. The complete restaurant has **248,876 indexed vertices, 343,114 triangles and 19 material batches**. The scene renders on demand and reuses its floor reflection until the camera or textures change. All model data and textures are local and included in the offline cache; no Meshy or other generation service is contacted by the app.

The supplied textures add approximately 17 MB of assets, downloaded when updating and cached for offline use. They are deliberately retained unchanged.

**9 focused checks passed** for application task/focus/build/undo handlers and scene switching, saved data, model counts and UVs, placement clear of the aisle, reflections, disposal, project-relative asset paths and offline updates. The final package was checked on the current public repository baseline (`d89b234`) with this update applied.

The eight previews in **previews/** were rendered from the actual application geometry, materials and shaders using native OpenGL ES. They are not AI concept images or browser screenshots. Browser interaction and physical phone/computer performance were not directly tested in this environment.

This update has **not** been deployed to your GitHub repository.
