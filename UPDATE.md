# Daycraft 1.18.3 — wilder Stormwatch sea

The long, irregular horizon swells are now taller and steeper, with more persistent whitewater, stronger wind texture and higher spray. A matched 6,000-point comparison against v1.18.2 measured about **69% greater RMS wave height** and **67% greater RMS forward slope**. The prevailing direction and curved, uneven crests are retained.

Foam now has its own particle system: 1,200 surface-following fragments on desktop and 480 on phones. Individual fragments are born on crests, drift, spread and fade, with ragged edges and gaps. Their corners follow the same three-dimensional sea as the water mesh.

Airborne splash and spray use 720 particles on desktop and 300 on phones. Coastal impacts throw droplets higher; offshore whitecaps shed lower windblown spray. Gusts push the droplets sideways as gravity brings them back down. The room, viewing controls and seated camera are unchanged.

## Install

Extract **Daycraft_Stormwatch_Wilder_Sea_Update_v1.18.3.zip** and upload its **contents to the root of `main`** in `mpb029/Daycraft`, replacing matching files and preserving folders. Leave other files in place. This cumulative patch includes the v1.18.1 modelled water/fire and v1.18.2 irregular swells, so it applies over **v1.18.0, v1.18.1 or v1.18.2**. It has not been pushed or published automatically.

After Pages publishes, use **Reload update** if offered and check for **1.18.3** beside the logo. Choose **Stormwatch → Storm window** to see the rougher water clearly.

## Preview and checks

The 12-second preview uses the actual runtime meshes and shaders: nine seconds at the window with rain off, followed by three seconds in the refuge. The additional foam geometry brings the scene to 216,888 triangles / 12 draw calls on desktop and 91,032 triangles / 12 draw calls on phones. Physical device frame rates have not been benchmarked.

13 focused Node checks passed, covering wave normals, smooth motion, irregular spacing, dominant crest direction, distant filtering, particle resource reuse, saved settings, app actions and offline updates. The 6,000-point comparison found no inverted surfaces. The maximum theoretical wave rise remains more than eight metres below the fixed eye position.

Run checks:
`node --test verification/stormwatch.test.mjs verification/app-smoke.test.mjs verification/pages.test.mjs verification/overlay.test.mjs`

Render the preview:
`node verification/export-stormwatch-graphics.mjs --wild`
then `python3 verification/render-cinema-graphics.py --stormwatch`

---

# Daycraft 1.18.2 — irregular horizon swells

Stormwatch's waves now form long, curved swells across the visible horizon. A prevailing direction replaces the strongly crossing wave sets. Seeded fields continuously vary crest height, curvature and spacing as the water travels, so the surface neither forms a regular waffle pattern nor jumps randomly between frames. Foam breaks into uneven patches, and spray responds to the crest at each impact point.

Each wavelength fades before it becomes too small for the distant mesh to resolve. This prevents a second source of grid artefacts near the horizon. The water still moves as actual three-dimensional geometry.

## Install

Extract **Daycraft_Stormwatch_Irregular_Swells_Update_v1.18.2.zip** and upload its **contents to the root of `main`** in `mpb029/Daycraft`, replacing matching files and preserving folders. Leave other files in place. This cumulative patch works over **v1.18.0 or v1.18.1** and includes the modelled sea/fire work from v1.18.1. It has not been pushed or published automatically.

After Pages publishes, use **Reload update** if offered and check for **1.18.2** beside the logo. Select **Stormwatch → Storm window**; rain can be turned off to inspect the swells clearly.

## Preview and checks

The 16-second preview uses the actual runtime meshes and materials: 12 seconds at the window with rain off, followed by four seconds in the refuge. The scene uses the same 214,488 triangles / 11 draw calls on desktop and 90,072 triangles / 11 draw calls on phones as v1.18.1. The new shader performs additional noise calculations; physical device frame rates have not been benchmarked.

13 focused Node checks passed, including independent finite-difference normals, smooth temporal motion, irregular crest spacing, predominant crest direction, distant wavelength filtering, existing app actions, saved settings and offline updates. Native OpenGL ES rendered the desktop and mobile materials. An additional 6,000-point geometry sample found no inverted surfaces.

Run checks:
`node --test verification/stormwatch.test.mjs verification/app-smoke.test.mjs verification/pages.test.mjs verification/overlay.test.mjs`

Render this preview:
`node verification/export-stormwatch-graphics.mjs --swells`
then `python3 verification/render-cinema-graphics.py --stormwatch`

---

# Daycraft 1.18.1 — modelled Stormwatch waves and fire

Stormwatch now has an actual displaced ocean mesh. Six crossing travelling waves move vertices vertically and horizontally, with bending crests, geometry-derived normals, reflected storm light, whitecaps and fading foam. The concrete breakwater and its beacon have thickness and depth; passing waves can hide their lower faces. Spray follows three-dimensional ballistic paths timed to approaching crests.

The stove contains modelled charred logs and an ember bed, plus a turbulent three-dimensional flame volume rendered through its closed doors. Water and flame shaders do not sample an animated photograph. The room retains the approved fixed-view artwork, with its existing pan/zoom controls, rain, lightning, steam and steady camera.

## Install

Extract **Daycraft_Stormwatch_Modelled_Waves_Update_v1.18.1.zip** and upload its **contents to the root of `main`** in `mpb029/Daycraft`, replacing matching files and preserving folders. Leave other files in place. This patch builds on **v1.18.0**; it has not been pushed or published automatically.

After Pages publishes, use **Reload update** if offered, check for **1.18.1** beside the logo, and select **Stormwatch**. Rain, lightning and Pause scenery work as before. Calm mode, reduced motion and hidden tabs pause the shared viewing clock. Your tasks, Problems and saved progress are unchanged.

## Preview and checks

The 16-second preview comes from the actual runtime meshes and shaders: six seconds in the refuge, six seconds at the window with rain off to expose the water geometry, and four seconds by the fire. A wireframe diagnostic and portrait views were also rendered during verification.

11 focused Node checks passed, covering wave displacement and normals against finite differences, the saved settings, fixed camera and lens bounds, shared pause clock, actual procedural water/fire materials, mobile resource limits, app actions and scoped offline updates. Native OpenGL ES compiled and rendered the actual materials. No browser takeover was needed for the unchanged controls.

This is a procedural wave and fire model, not a CFD simulation. The scene uses 214,488 triangles and 11 draw calls on desktop; phones use 90,072 triangles, fewer spray particles and 28 flame samples per ray rather than 44. It retains the app's 24 fps scenery limit. Real geometry costs more than the previous image effect; physical phone/GPU frame rates have not been benchmarked.

Run focused checks:
`node --test verification/stormwatch.test.mjs verification/app-smoke.test.mjs verification/pages.test.mjs verification/overlay.test.mjs`

Render the preview:
`node verification/export-stormwatch-graphics.mjs --film`
then `python3 verification/render-cinema-graphics.py --stormwatch`

---

# Daycraft 1.18.0 — Stormwatch

A warm lighthouse refuge above a violent coastal storm. The sea rolls and churns, clouds drift, gusts drive rain across closed windows, droplets descend in narrow rivulets, and waves send bursts of spray above the breakwater. Distant lightning appears briefly. The stove fire and mug steam move more gently inside; the room and camera stay steady.

## Install

Extract **Daycraft_Stormwatch_Update_v1.18.0.zip** and upload its **contents to the root of `main`** in `mpb029/Daycraft`. Replace matching files, preserve the `assets/stormwatch/` and `verification/` folders, and leave other files in place. This patch builds on the existing **v1.17.1** app. It has not been pushed or published automatically.

After GitHub Pages publishes, choose **Reload update** if offered and check for **1.18.0** beside the logo. Select **Stormwatch** from the background menu, or use **New scene · Stormwatch → Open**. Your tasks, Problems, materials and meadow arrangement are preserved.

## Controls

- **Refuge**, **Storm window** and **Fireside** change where you look from the same safe seat. Drag to look around; scroll or pinch to zoom.
- **Rain** and **Lightning** have separate saved switches for this scene.
- **Pause scenery** freezes every animation layer using Calm mode. The device's reduced-motion preference also freezes the scene. Hidden tabs and an out-of-view canvas pause the viewing clock without catching up later.
- **Space** or **Hide panels** clears the task overlay. The same button restores it on a phone.

Stormwatch uses the approved artwork projected onto depth layers, with independent surface animation and spray/steam meshes. It is a stationary seated scene with bounded pan and zoom, rather than a freely walkable reconstruction. It keeps its own overcast storm light. No sound is included in this release.

If WebGL is unavailable, an explicitly labelled still view keeps the room visible and the task app usable; the animation requires WebGL 2. The preview MP4 was rendered from the actual scene geometry, shaders and animation clock.

## Validation

22 focused checks passed: scene preferences and backup migration; lens coverage in portrait, landscape and ultrawide; a stationary camera and shared pause clock; task and Problems event flows; rain/lightning/pause controls; Space overlay behavior; project-relative assets; scoped offline updates; and existing water camera controls and tidal cycle.

The scene's actual GLSL shaders compiled and rendered with native OpenGL ES. Opening, window, fireside and portrait views were inspected, and 288 frames were rendered for the 12-second preview. The browser check confirmed scene selection, the honest still fallback and Space toggling; WebGL was unavailable in that cloud browser. This is not a physical phone performance benchmark.

The scene uses five draw calls, 14,344 triangles on desktop or 4,616 on mobile, and about 0.87 MB of new textures. It reuses the app's 24 fps scenery limit and allocates no new buffers per animation frame. No live external assets or new dependencies are required.

Run checks:
`node --test verification/stormwatch.test.mjs verification/app-smoke.test.mjs verification/pages.test.mjs verification/overlay.test.mjs verification/water.test.mjs`

Render actual scene frames:
`node verification/export-stormwatch-graphics.mjs --film`
then `python3 verification/render-cinema-graphics.py --stormwatch`

---

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
