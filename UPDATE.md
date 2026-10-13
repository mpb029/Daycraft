# Daycraft — 1980s video store, version 1.11.0

This update adds the video store to the actual Daycraft background selector. The earlier standalone TV-preview HTML did not update the app. This package is based on the published v1.10.1 files in mpb029/Daycraft (commit f439090). It has not been pushed to GitHub or deployed by the assistant.

## Install in your existing repository

1. Extract **Daycraft_Blockbuster_Update_v1.11.0.zip**.
2. Open https://github.com/mpb029/Daycraft/upload/main . Drag the extracted files and folders into the upload area. Keep the `assets/video-store` folder structure. Replace matching filenames beside your existing `index.html`. Upload the contents, not the ZIP or its outer folder.
3. Commit to `main` and wait for the GitHub Pages deployment to finish in **Actions**. Keep the existing Pages settings and all other app files.
4. Open https://mpb029.github.io/Daycraft/ . Reload once to download the update, wait a few seconds, then reload again. If it still shows the old version, close every Daycraft browser tab and installed-app window, then reopen. **Do not clear site data**: that would remove your browser's saved progress.
5. Look for **1.11.0 beside “daycraft”**. Choose **1980s video store** from the background dropdown, or press **Open** in the new-background notice.
6. Press **Play trailers** once. Use **TV view** for a closer look; **Shelf view** moves to the VHS shelf; **Read VHS covers** opens the original scans. **Space / Hide panels** retains the existing overlay behavior.

After updating, this link opens the store directly:
https://mpb029.github.io/Daycraft/?scene=video-store

The update ZIP contains changed files and new assets only. Keep the existing vendor, icons, meadow, water, forest and earned-item files. The verification and previews folders are optional supporting files.

## What changes

- A selectable, interactive 3D video store: blue carpet, cream shelves, period-inspired ticket branding, ceiling lighting, CRT checkout terminals and an overhead television.
- Original high-resolution VHS scans mapped onto the actual shelf cases. Shelf view and the scan viewer make the spines readable. Store signs use real text rather than generated lettering.
- A four-trailer reel: **Back to the Future Part II (1989)**, **Gremlins (1984)**, **Toys (1992)** and **The Thing (1982)**. It advances on playback-end events and loops after the fourth trailer. Toys is the requested exception to the 1980s theme.
- Play, pause, next, sound and camera controls. Playback starts muted, pauses when the tab is hidden, and stops when another scene is selected. Native player pauses are respected. The player survives task-panel rerenders and Space toggling.
- Visible app version and an update notice for future releases. The offline worker activates only after all required files are cached. Failed or incomplete asset uploads do not replace the working offline version.

All backgrounds continue to share your existing tasks, materials, collection and placements. Indoor lights stay on; the store windows follow the time outside. Outdoor rain settings are retained when switching scenes. The store draws only when the camera or scene changes, apart from periodic daylight refreshes; the video player manages its own frames.

## Accuracy and playback limits

This is a stylised 3D implementation, not a photographic reproduction of the concept image or a measured reconstruction of a particular store. Its shelf catalogue deliberately repeats three verified US editions: Gremlins (Warner 11388), The Thing (MCA 77009), and Back to the Future (MCA 80196). Gremlins and The Thing have original front and spine scans; Back to the Future has an original spine only. There is no invented front cover for that edition. Collector watermarks remain intact. The entire historical catalogue and every physical packaging surface are not 100% reproduced.

Trailers stream through YouTube and Vimeo embeds; no downloaded film footage is included. They require internet access and may be unavailable if a provider blocks embedding, a browser blocks the player, or a video is removed. The source link and Next control remain available. Live browser playback has not been verified in this environment.

Sources are recorded in `assets/video-store/provenance.json` and `video-store-catalog.mjs`. Branding and movie artwork remain the property of their respective owners. This personal scene is not affiliated with Blockbuster or the film distributors.

## Verification

All 72 automated checks pass. The included Node suite checks task/focus/completion/build behavior; saved-state migration; placements; existing scenes and wave timing; store selection; the four-film playback state machine; stale callbacks; pause/visibility behavior; TV projection at desktop and phone dimensions; file paths; and cache-update safety.

Run from the app folder:

```sh
node --test verification/*.test.mjs
```

The 3D store's shaders were compiled and rendered with native OpenGL ES. Desktop, portrait, shelf and TV camera views were checked. Images in `previews/video-store-*.png` are native renders of the shipped geometry and materials with a standby TV screen. They are not browser screenshots or evidence of successful streamed playback. Browser layout, provider playback and device frame rate still need checking on your phone/computer.

Optional graphics checks require Linux EGL/GLES, Node, Python, Pillow and CairoSVG:

```sh
node verification/export-store-graphics.mjs
python3 verification/render-store-graphics.py
```
