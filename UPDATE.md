# Daycraft 1.13.0 — Cinema café

A new selectable scene based on your supplied “McDonald’s Movie Memorabilia Corridor” image: the stair entrance, polished chrome rails, dark mosaic tiles, burgundy booths, pale laminate tables, warm display cabinets and reflective central aisle.

## Install this update

This package updates the existing Daycraft 1.12 installation. It is not a replacement for the entire repository.

1. Extract `Daycraft_Cinema_Cafe_Update_v1.13.0.zip`.
2. Open the **Code** tab in `mpb029/Daycraft`, with **main** selected.
3. Choose **Add file → Upload files**. Drag the **contents inside** the extracted folder onto GitHub: the root files and the `assets`, `previews` and `verification` folders together. Keep their folder structure. Do not upload the enclosing ZIP folder.
4. Commit the upload and let GitHub Pages finish deploying.
5. Open your usual Daycraft address. If shown, press **Reload update**. Confirm **1.13.0** beside the Daycraft name.
6. Choose **Cinema café** from the background selector. The new scene also opens at `https://mpb029.github.io/Daycraft/?scene=cinema` after deployment.

`index.html`, `app.mjs`, `cinema-world.mjs` and the other root files sit beside each other. The new images must be at `assets/cinema/…`. Existing elephant, forest and video-store assets stay in their existing folders.

## Scene controls

- **Stairway**, **Gallery**, **Elephant**, **Booths** change the viewing position.
- Drag to look around; scroll or pinch to zoom.
- **Space** or **Hide panels** toggles the existing task and progress overlay.
- The indoor lighting stays warm at any time of day. Outdoor rain preferences remain saved for the other scenes.

Your tasks, earned items, meadow placements, history and backups use the existing save format. The update does not clear or replace browser data.

## Fidelity and rendering

The architecture, furniture, stair rails, cabinets and existing elephant are actual 3D geometry. The six other exhibits use detailed generated artwork recessed inside the 3D glass cabinets. These are visual interpretations of the supplied reference, not scans or authenticated replicas of screen-used props. No diners have been added.

The floor reflects the real scene from the current viewpoint. Rounded vinyl edges, small tile grout, metallic highlights, ceiling panels, exhibit labels, plants and table settings provide detail. The gallery is static and renders on demand; it does not run a continuous animation loop. Reflections are lower resolution on small screens and reused until the camera or artwork changes. No browser/device frame-rate measurement is claimed.

## Validation

76 automated checks pass, covering task completion, focus, undo, inventory, scene changes, saved data and offline file paths. Cinema checks also cover reflected camera alignment, render-target feedback prevention, failure recovery and resource disposal.

Five views were rendered from the actual geometry and shaders with native OpenGL ES, including the reflected floor and a portrait phone aspect ratio. The supplied PNGs are those renders. They are not browser screenshots; browser layout, live interaction and physical-device performance were not directly exercised in this environment.

The package has not been deployed to your GitHub repository.
