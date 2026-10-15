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
