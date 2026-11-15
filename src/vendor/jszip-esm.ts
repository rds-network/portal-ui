/**
 * ESM-friendly export for docx-preview (`import JSZip from "jszip"`).
 * Uses the self-contained UMD build: `lib/` is raw CommonJS and Vite does not
 * transform CJS inside `src/`, which fails in the browser with "require is not defined".
 * Without `module`/`define` in scope, the UMD wrapper assigns `window.JSZip`.
 */
import "./jszip/dist/jszip.min.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const JSZip = (globalThis as any).JSZip

export default JSZip
