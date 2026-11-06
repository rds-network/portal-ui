/**
 * ESM-friendly export for docx-preview (`import JSZip from "jszip"`).
 * Vendored jszip uses `module.exports = JSZip`.
 */
import * as JSZipModule from "./jszip/lib/index.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const JSZip = (JSZipModule as any).default ?? JSZipModule

export default JSZip
