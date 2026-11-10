# Taka-Layout App (HCM-Layout) — Architecture & Coding Conventions

> ⛔ **INVIOLABLE RULE**: Never delete, disable, or degrade existing business logic, UI/UX, features, or data flows in **Floor Layout** and **Picture Mapping**. All changes must be strictly additive or optimizations.
> ⚡ **AGENTS.MD MAINTENANCE**: Preserve 100% rule integrity and write strictly in **Telegraphic Imperative English** to minimize token usage.

## 0. Core Operating Mindset
1. **Think Before Coding & Clarify Ambiguity**: Cross-check `ARCHITECTURE.md` and `src/api-contracts.ts` before modifying code. Assess impact on CAD/PDF polygon matching, heatmap visualization, picture pins, and unit comparison formulas. **If any requirement, scope, or edge case is unclear, ask the user to clarify before writing code.**
2. **Simplicity First**: Reuse existing services in `src/lib/` and hooks in `src/hooks/`. Strictly enforce `< 500` lines/file. Decouple UI components from store implementations.
3. **Surgical Changes**: Modify only the target file/function. Never rewrite entire modules, strip business comments, or alter unrelated files.
4. **Goal-Driven Validation**: Implement -> Validate (`npx tsc --noEmit` and `npm run build`) -> Fix until 0 syntax, typing, or build errors.

## 1. Single Source of Truth (SSoT) & 3-Step Workflow
- **SSoT Lookup Order**:
  1. `ARCHITECTURE.md`: Folder structure, `*Parts/` submodules, `src/lib/` & `src/hooks/` catalog. Never introduce non-conforming folders.
  2. `src/api-contracts.ts` & `src/types.ts`: Interfaces, types, enums, store actions, and data contracts. Always verify prop names and signatures here.
  3. `src/lib/standaloneComparisonService.ts`: SSoT for Option A Excel/CSV data schema, template generator, unit code matcher, and JSON backup format.
- **3-Step Workflow**:
  1. **Check Map & Contracts**: Locate submodule in `ARCHITECTURE.md` and verify types in `src/types.ts`.
  2. **Implement**: Keep files `< 500` lines, strict TypeScript (zero `any`), atomic Zustand selectors, and memoized sub-components.
  3. **Validate & Build**: Run `npx tsc --noEmit` and `npm run build` before finishing. Ensure Cloudflare static compatibility.

## 2. Standalone App Architecture & State Management
- **2-Tab Core Scope**: The app exclusively operates two core modules:
  - `layout`: Floor Layout Canvas (CAD/PDF polygons, unit sizing, heatmap metrics, unit lightboxes).
  - `picture_mapping`: 360° & photo pins on floorplans, hotspot navigation, and dynamic hierarchy review.
- **Zero-Login Standalone Mode**:
  - Boot directly at `activeTab = "layout"` (see `src/store/slices/createUISlice.ts`).
  - Default user role set to `admin` with full edit rights (see `src/store/slices/createDataSlice.ts`). No authentication walls or login barriers.
- **Standalone Navigation Header (`src/components/StandaloneHeader.tsx`)**:
  - Hosts the 2-tab switcher (`layout` ⇄ `picture_mapping`).
  - Houses Option A Toolbar: Download Excel Template, Import Excel/CSV Comparison, and Export/Import Full Workspace JSON.
- **Zustand Slices (`src/store/useAppStore.ts`)**:
  - Use atomic selectors (`state => state.layoutConfigs`) and shallow hooks to prevent unnecessary re-renders.
  - Apply immediate (0ms) optimistic state updates for UI gestures, polygon selections, and pin placements.

## 3. Option A Standalone Comparison & Workspace Backup Engine
- **Independent Client-Side Data SSoT (`src/lib/standaloneComparisonService.ts`)**:
  - **Template Download**: `downloadComparisonTemplate()` exports standard `Taka_Layout_Comparison_Template.xlsx` with complete columns (`Unit Code`, `Brand`, `Zone`, `Floor`, `Category`, `Contract Size (m2)`, `Progress (%)`, `Status`, `Plan Start/End`, `Actual Start/End`, `Sales`, `Profit`, `Rent Cost`).
  - **Excel/CSV Ingestion**: `importComparisonExcelOrCsvFile()` parses `.xlsx`/`.csv`, normalizes unit codes (`uName.toLowerCase().trim()`), computes diff against CAD polygon $m^2$, and maps schedule/financial attributes.
  - **Persistent Storage**: Hydrates and saves comparison rows into `localStorage` (`taka_standalone_comparison_rows`) + IndexedDB.
  - **Full JSON Workspace Backup/Restore**:
    - `exportFullStandaloneWorkspaceJson()` bundles floor configs, CAD polygons, picture mapping pins, and comparison records into a single `.json` file for cold migration.
    - `importFullStandaloneWorkspaceJson()` validates and restores full workspace state with zero data loss.

## 4. Konva Canvas, PDF/CAD & Picture Mapping Rules
- **Konva & Canvas 60 FPS Performance**:
  - Static Konva shapes must set `listening={false}` and `perfectDrawEnabled={false}`.
  - Direct node transform with `requestAnimationFrame` and `batchDraw()` during zoom/pan/drag. Cancel RAF on unmount.
  - Background-decode floorplan images via `useOffscreenImage` to prevent canvas reloads during tab/filter changes.
- **Unit Shape Matching (`src/lib/unitSizeResolver.ts` & `layoutDataAggregator.ts`)**:
  - Match drawn `UnitShape` polygons to comparison records using normalized unit code.
  - Compare CAD effective area (`getUnitEffectiveSizeM2`) vs Contract Size $m^2$.
  - Heatmap engine supports color coding by: Progress %, Area Variance, Plan vs Actual schedule status, and Financial density ($/m^2).
- **Picture Mapping & Media Management**:
  - Support 360° equirectangular panoramas and standard inspection photos linked to pin coordinates on floorplans.
  - Use `compressImageToWebp` (max 1920px, 0.82 quality) before storing/uploading.
  - Support Cloudflare R2 / local blob URLs with clean orphan purge on pin deletion.

## 5. Cloudflare Pages & Deployment Standards
- **Cloudflare Static / Workers Deployment**:
  - Output directory is strictly `dist/`.
  - Build script: `npm run build` runs `vite build`.
  - Deployment configuration defined in `wrangler.jsonc` with:
    - `assets.directory = "./dist"`
    - `assets.not_found_handling = "single-page-application"`
    - `compatibility_flags = ["nodejs_compat"]`
  - **Do NOT create `public/_redirects`** with catch-all `/* /index.html 200` rules, as Cloudflare Workers Assets will detect an infinite redirect loop.
- **Node Runtime**: Cloudflare build environment must use Node 20+ (Node 22 recommended).
