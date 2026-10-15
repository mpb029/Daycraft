# 90s Macca’s scene — Daycraft 1.15.0

The original staircase, centre aisle, booth arrangement and rear side passage are retained. Movie displays, display cabinets, film posters, labels and cinema wayfinding are no longer instantiated or loaded.

Ronald, Grimace, Hamburglar and Birdie now use the four Meshy OBJ/MTL/PNG archives supplied by the user on 15 October 2026. The previous procedural character meshes have been replaced completely. The supplied geometry, UV seams, valid normals and original 2048-pixel PNG textures are retained; one zero Ronald normal is repaired from neighbouring triangles. Each model is normalized and positioned in metres by `maccas-mascots.mjs`. Exact filenames, hashes and geometry counts are recorded in `models/provenance.json`.

Ronald sits on a perforated yellow steel bench with a red frame. Grimace sits on the corner banquette; Hamburglar and Birdie are smaller ornaments among the planted dividers. These are textured 3D models, not image panels or authenticated scans of a particular restaurant. McDonald’s names and character designs belong to their respective owners.

`maccas-plants.mjs` builds curved 3D pothos leaves, ficus branches, palms and hanging plants. Restaurant plaques are local SVG artwork. No downloaded reference photograph is a scene texture.

Visual references consulted on 14 October 2026:

- Ronald on a yellow bench: https://parade.com/food/mcdonalds-1990s-nostalgic-photos
- Period interior and planting: https://www.awesomeinventions.com/old-mcdonalds-80s-and-90s/
- Surviving Grimace fibreglass statue: https://www.2000toys.jp/product/20680
- Birdie moulding and painted details: https://www.ebay.com/itm/286793387456
- Character statue proportions: https://ishare.ifeng.com/c/s/v002zU1QTjfZzGCxCVRvFmQjmnjBcJt3HtpAZtyGBC8ManU__

The scene loads `welcome.svg`, `mcdonalds.svg`, `facilities.svg` and the four `models/*-color.png` textures. All geometry and textures are local and included in the offline cache. Older exhibit files, if still present after a GitHub web upload, are unused.
