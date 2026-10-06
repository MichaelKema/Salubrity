# Third-party components

## Magic UI

`src/components/magicui/number-ticker.tsx` is copied from the official Number Ticker registry. Salubrity uses a static counter when reduced motion is requested.

- Component: https://magicui.design/docs/components/number-ticker
- Source: https://magicui.design/r/number-ticker.json
- License: MIT, copyright Magic UI (see `licenses/MAGIC_UI_LICENSE.md`).

## Other dependencies and data

React, Vite, Motion, Tailwind CSS, Lucide, and the other npm dependencies retain their respective licenses. Release builds bundle collected license texts under `licenses/DEPENDENCY_NOTICES.txt`. DM Sans and Manrope are distributed by Fontsource with their font licenses.

Optional packaged-food search uses Open Food Facts (https://world.openfoodfacts.org). Imported labels are attributed in the food library and search interface. Data licensing: https://world.openfoodfacts.org/data.

Salubrity's nutrition-grid layout and bowl illustration are project-owned source. The previously copied Aceternity grid has been replaced.

Open Food Facts database licensing: ODbL; individual database contents: Database Contents License. Product images have their own licensing. No food database or product images are bundled in this release.
