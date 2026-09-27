import fontkit from "@pdf-lib/fontkit"
import { ApplicationDto } from "@rds-network/portal-api-axios"
import { saveAs } from "file-saver"
import type { Rotation } from "pdf-lib"
import { PDFDocument, PDFFont, degrees, rgb } from "pdf-lib"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import { getFullAddress } from "src/shared/utils/getFullAddress"

type Ori = 0 | 90 | 180 | 270
interface Rect {
    x: number
    y: number
    w: number
    h: number
}

const ORIENTATION_OFFSET: Ori = 90
const NAME_POS = { x: 35, y: 180, size: 10 as const }
const PHONE_POS = { x: -15, y: 243, size: 8 as const }
const ADDRESS_BOX: Rect = { x: 35, y: 210, w: 180, h: 70 }
const ADDRESS_FONT = { max: 9, min: 6, lineGapRatio: 0.4 }

export default async function generateEnvelopPdf(application: ApplicationDto) {
    const fullName = assertNotNull(application.name, "Name")
    const phone = assertNotNull(application.phone, "Phone")
    const address = getFullAddress(
        assertNotNull(application.postalCode, "Postal code"),
        assertNotNull(application.city, "City"),
        assertNotNull(application.address, "Address")
    )

    const templateBytes = await fetch("/resources/envelop.pdf").then((r) => r.arrayBuffer())
    const pdf = await PDFDocument.load(templateBytes)
    pdf.registerFontkit(fontkit)

    const mediumFont = await pdf.embedFont(
        Uint8Array.from(atob(MONTSERRAT_MEDIUM_NORMAL), (c) => c.charCodeAt(0)),
        { subset: true }
    )
    const boldFont = await pdf.embedFont(
        Uint8Array.from(atob(MONTSERRAT_BOLD_BOLD), (c) => c.charCodeAt(0)),
        { subset: true }
    )

    const page = pdf.getPages()[0]
    const { width, height } = page.getSize()
    const pageAngle = normAngle(page.getRotation()?.angle ?? 0)
    const finalOrientation = normAngle(pageAngle + ORIENTATION_OFFSET)
    const vWidth = pageAngle === 90 || pageAngle === 270 ? height : width
    const vHeight = pageAngle === 90 || pageAngle === 270 ? width : height

    function mapXY(xVis: number, yVis: number, fontSize: number, orientation: Ori) {
        const yTop = vHeight - yVis - fontSize
        let px = xVis,
            py = yTop
        let rot: Rotation | undefined

        switch (orientation) {
            case 0:
                break
            case 90:
                px = yVis
                py = vWidth - xVis - fontSize
                rot = degrees(90)
                break
            case 180:
                px = vWidth - xVis - fontSize
                py = vHeight - yTop - fontSize
                rot = degrees(180)
                break
            case 270:
                px = vHeight - yVis - fontSize
                py = xVis
                rot = degrees(270)
                break
        }
        return { x: px, y: py, rotate: rot }
    }

    function drawTextLine(text: string, x: number, y: number, font: PDFFont, size: number, orientation: Ori) {
        const { x: px, y: py, rotate } = mapXY(x, y, size, orientation)
        page.drawText(text, { x: px, y: py, rotate, font, size, color: rgb(0, 0, 0) })
    }

    function wrapText(font: PDFFont, size: number, text: string, maxWidth: number): string[] {
        const words = text.trim().split(/\s+/)
        const lines: string[] = []
        let cur = ""

        const fits = (s: string) => font.widthOfTextAtSize(s, size) <= maxWidth

        for (const w of words) {
            const candidate = cur ? cur + " " + w : w
            if (fits(candidate)) {
                cur = candidate
            } else {
                if (cur) lines.push(cur)

                if (!fits(w)) {
                    let start = 0
                    while (start < w.length) {
                        let end = start + 1
                        while (end <= w.length && fits(w.slice(start, end))) end++
                        lines.push(w.slice(start, end - 1))
                        start = end - 1
                    }
                    cur = ""
                } else {
                    cur = w
                }
            }
        }
        if (cur) lines.push(cur)
        return lines
    }

    function fitTextInBox(
        text: string,
        rect: Rect,
        opts: { font: PDFFont; max: number; min: number; lineGapRatio: number }
    ) {
        const { font, max, min, lineGapRatio } = opts
        let lo = min,
            hi = max
        let bestSize = min,
            bestLines = wrapText(font, min, text, rect.w)

        while (hi - lo > 0.1) {
            const mid = (lo + hi) / 2
            const lines = wrapText(font, mid, text, rect.w)
            const lineGap = mid * lineGapRatio
            const blockH = lines.length * mid + (lines.length - 1) * lineGap
            const widthOk = lines.every((l) => font.widthOfTextAtSize(l, mid) <= rect.w)
            const heightOk = blockH <= rect.h

            if (widthOk && heightOk) {
                bestSize = mid
                bestLines = lines
                lo = mid + 0.1
            } else {
                hi = mid - 0.1
            }
        }
        return { size: bestSize, lines: bestLines, lineGap: bestSize * lineGapRatio }
    }

    function drawTextBox(
        text: string,
        rect: Rect,
        opts?: {
            font?: PDFFont
            align?: "left" | "center" | "right"
            orientation?: Ori
            max?: number
            min?: number
            lineGapRatio?: number
        }
    ) {
        const font = opts?.font ?? mediumFont
        const align = opts?.align ?? "left"
        const orientation = opts?.orientation ?? finalOrientation
        const fit = fitTextInBox(text, rect, {
            font,
            max: opts?.max ?? ADDRESS_FONT.max,
            min: opts?.min ?? ADDRESS_FONT.min,
            lineGapRatio: opts?.lineGapRatio ?? ADDRESS_FONT.lineGapRatio,
        })

        fit.lines.forEach((line, i) => {
            const y = rect.y + i * (fit.size + fit.lineGap)
            let x = rect.x
            if (align !== "left") {
                const w = font.widthOfTextAtSize(line, fit.size)
                if (align === "center") x += (rect.w - w) / 2
                else x += rect.w - w
            }
            drawTextLine(line, x, y, font, fit.size, orientation)
        })
    }

    drawTextLine(fullName, NAME_POS.x, NAME_POS.y, boldFont, NAME_POS.size, finalOrientation)
    drawTextBox(address, ADDRESS_BOX, { font: mediumFont, orientation: finalOrientation })
    drawTextLine(phone, PHONE_POS.x, PHONE_POS.y, mediumFont, PHONE_POS.size, finalOrientation)

    const pdfBytes = await pdf.save()
    saveAs(
        new Blob([pdfBytes as BlobPart], { type: "application/pdf" }),
        `Koverat_${fullName.replace(/\s+/g, "_")}.pdf`
    )
}

function normAngle(a: number): Ori {
    const n = ((a % 360) + 360) % 360
    return (n === 0 || n === 90 || n === 180 || n === 270 ? n : 0) as Ori
}

function assertNotNull(value: string | null | undefined, name: string): string {
    const v = (value ?? "").trim()
    if (!v) throw new Error(`${name} is empty or blank`)
    return v
}
