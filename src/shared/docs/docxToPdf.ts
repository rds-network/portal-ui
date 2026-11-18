import { saveAs } from "file-saver"
import { jsPDF as JsPdf } from "jspdf"

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const RENDER_SCALE = 2.5

const waitForImages = (root: HTMLElement) =>
    Promise.all(
        Array.from(root.querySelectorAll("img")).map((img) =>
            img.complete
                ? Promise.resolve()
                : new Promise<void>((resolve) => {
                      img.onload = () => resolve()
                      img.onerror = () => resolve()
                  })
        )
    )

/**
 * Renders the DOCX exactly as the preview shows it and puts each page into the PDF as an image,
 * so the stamped document cannot be edited.
 */
export async function docxToImagePdf(docx: Blob): Promise<Blob> {
    const [{ renderAsync }, { default: html2canvas }] = await Promise.all([
        import("src/vendor/docx-preview/dist/docx-preview.mjs"),
        import("html2canvas"),
    ])
    const host = document.createElement("div")
    host.style.cssText = "position:fixed;left:-10000px;top:0;font-family:'Times New Roman',Times,serif;"
    document.body.appendChild(host)
    try {
        await renderAsync(await docx.arrayBuffer(), host, undefined, {
            className: "docx",
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
        })
        await waitForImages(host)
        await document.fonts.ready

        const pages = Array.from(host.querySelectorAll<HTMLElement>("section.docx"))
        const pdf = new JsPdf({ orientation: "p", unit: "mm", format: "a4", compress: true })
        for (const [index, page] of pages.entries()) {
            const canvas = await html2canvas(page, {
                scale: RENDER_SCALE,
                backgroundColor: "#ffffff",
                logging: false,
            })
            if (index > 0) {
                pdf.addPage("a4", "p")
            }
            const fit = Math.min(1, (A4_HEIGHT_MM * canvas.width) / (A4_WIDTH_MM * canvas.height))
            const widthMm = A4_WIDTH_MM * fit
            const heightMm = (widthMm * canvas.height) / canvas.width
            pdf.addImage(
                canvas.toDataURL("image/jpeg", 0.92),
                "JPEG",
                (A4_WIDTH_MM - widthMm) / 2,
                0,
                widthMm,
                heightMm
            )
        }
        return pdf.output("blob")
    } finally {
        host.remove()
    }
}

export const pdfFileName = (docxFileName: string) => docxFileName.replace(/\.docx$/i, "") + ".pdf"

/** Converts a generated DOCX to an image PDF and optionally downloads it. */
export async function docxResultToPdf(
    result: { blob: Blob; fileName: string },
    options?: { download?: boolean }
): Promise<{ blob: Blob; fileName: string }> {
    const blob = await docxToImagePdf(result.blob)
    const fileName = pdfFileName(result.fileName)
    if (options?.download === true) {
        saveAs(blob, fileName)
    }
    return { blob, fileName }
}
