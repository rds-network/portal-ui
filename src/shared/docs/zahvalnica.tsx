import { notifications } from "@mantine/notifications"
import { jsPDF as JsPdf } from "jspdf"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import {
    BACKGROUND_COLORS,
    DEFAULT_LOGO,
    TextStyle,
    ZahvalnicaDraft,
    hexToRgb,
    recordZahvalnicaIssue,
    saveZahvalnicaDraft,
} from "src/shared/docs/zahvalnicaDraft"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"

const loadImageElement = async (src: string): Promise<HTMLImageElement | null> => {
    try {
        const url = src.startsWith("data:")
            ? src
            : await (async () => {
                  const res = await fetch(src)
                  if (!res.ok) return null
                  const blob = await res.blob()
                  return await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader()
                      reader.onload = () => resolve(String(reader.result))
                      reader.onerror = reject
                      reader.readAsDataURL(blob)
                  })
              })()
        if (!url) return null
        return await new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = url
        })
    } catch {
        return null
    }
}

const imageDataUrlWithOpacity = async (
    src: string,
    opacity: number,
    maxPx = 1600
): Promise<string | null> => {
    const img = await loadImageElement(src)
    if (!img) return null
    const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.clearRect(0, 0, w, h)
    ctx.globalAlpha = Math.min(1, Math.max(0, opacity / 100))
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL("image/png")
}

const applyStyle = (pdf: JsPdf, style: TextStyle) => {
    pdf.setFont(style.bold ? "Montserrat-Bold" : "Montserrat-Medium", style.bold ? "bold" : "normal")
    pdf.setFontSize(style.size)
    const [r, g, b] = hexToRgb(style.color)
    pdf.setTextColor(r, g, b)
}

type GenerateOpts = {
    issuedBy?: string
    /** open print dialog instead of downloading */
    print?: boolean
}

export default async function generateZahvalnicaPdf(draft: ZahvalnicaDraft, opts: GenerateOpts = {}) {
    const volunteerName = draft.volunteerName.trim()
    if (!volunteerName) {
        notifications.show({
            ...ErrorNotification,
            message: "Укажите имя волонтёра",
        })
        throw new Error("volunteerName required")
    }

    const ty = draft.typography
    const pdf = new JsPdf({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        compress: true,
    })

    pdf.addFileToVFS("Montserrat-Medium-normal.ttf", MONTSERRAT_MEDIUM_NORMAL)
    pdf.addFont("Montserrat-Medium-normal.ttf", "Montserrat-Medium", "normal")
    pdf.addFileToVFS("Montserrat-Bold-bold.ttf", MONTSERRAT_BOLD_BOLD)
    pdf.addFont("Montserrat-Bold-bold.ttf", "Montserrat-Bold", "bold")

    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const theme = BACKGROUND_COLORS[draft.background] || BACKGROUND_COLORS.white
    const [pr, pg, pb] = theme.page

    pdf.setFillColor(pr, pg, pb)
    pdf.rect(0, 0, pageW, pageH, "F")

    const watermarkSrc = draft.backgroundImageSrc || DEFAULT_LOGO
    const opacity = draft.backgroundOpacity ?? 12
    if (watermarkSrc && opacity > 0) {
        const faded = await imageDataUrlWithOpacity(watermarkSrc, opacity)
        if (faded) {
            try {
                const wmW = pageW * 0.55
                pdf.addImage(faded, "PNG", (pageW - wmW) / 2, (pageH - wmW) / 2 - 8, wmW, wmW, undefined, "FAST")
            } catch {
                /* ignore */
            }
        }
    }

    const frameColor = hexToRgb(ty.title.color)
    pdf.setDrawColor(frameColor[0], frameColor[1], frameColor[2])
    pdf.setLineWidth(0.6)
    pdf.rect(12, 12, pageW - 24, pageH - 24)
    pdf.setLineWidth(0.25)
    pdf.rect(14, 14, pageW - 28, pageH - 28)

    const marginX = 28
    const contentW = pageW - marginX * 2
    let y = 28

    const logoImg = await loadImageElement(draft.logoSrc || DEFAULT_LOGO)
    if (logoImg) {
        try {
            const canvas = document.createElement("canvas")
            canvas.width = logoImg.width
            canvas.height = logoImg.height
            canvas.getContext("2d")?.drawImage(logoImg, 0, 0)
            const logoData = canvas.toDataURL("image/png")
            const logoW = 32
            pdf.addImage(logoData, "PNG", (pageW - logoW) / 2, y, logoW, logoW, undefined, "FAST")
            y += logoW + 8
        } catch {
            y += 4
        }
    }

    applyStyle(pdf, ty.org)
    pdf.text(draft.orgTitle, pageW / 2, y, { align: "center", maxWidth: contentW })
    y += Math.max(10, ty.org.size * 0.45 + 4)

    applyStyle(pdf, ty.title)
    pdf.text(draft.title, pageW / 2, y, { align: "center", maxWidth: contentW })
    y += Math.max(12, ty.title.size * 0.45 + 4)

    pdf.setDrawColor(frameColor[0], frameColor[1], frameColor[2])
    pdf.setLineWidth(0.35)
    pdf.line(pageW / 2 - 28, y, pageW / 2 + 28, y)
    y += 12

    applyStyle(pdf, ty.name)
    pdf.text(volunteerName, pageW / 2, y, { align: "center", maxWidth: contentW })
    y += Math.max(12, ty.name.size * 0.45 + 4)

    const writeBlock = (text: string, gap = 8) => {
        applyStyle(pdf, ty.body)
        const lines = pdf.splitTextToSize(text.trim(), contentW)
        pdf.text(lines, pageW / 2, y, { align: "center" })
        y += lines.length * (ty.body.size * 0.4 + 1.2) + gap
    }

    if (draft.intro.trim()) writeBlock(draft.intro)
    if (draft.contribution.trim()) {
        writeBlock(`Посебну захвалност изражавамо за ${draft.contribution.trim()}.`)
    }
    if (draft.closing.trim()) writeBlock(draft.closing, 16)

    y = Math.max(y, pageH - 55)
    applyStyle(pdf, { ...ty.sign, bold: false, size: Math.max(8, ty.sign.size - 2) })
    pdf.text(draft.presidentLabel, pageW / 2, y, { align: "center" })
    y += 7
    applyStyle(pdf, ty.sign)
    pdf.text(draft.presidentName.trim() || "—", pageW / 2, y, { align: "center" })

    y = pageH - 28
    applyStyle(pdf, ty.meta)
    pdf.text(`${draft.place}, ${draft.dateLabel}`, marginX, y)
    pdf.text(`Број: ${draft.number}`, pageW - marginX, y, { align: "right" })

    const safeName = volunteerName.replace(/[^\p{L}\p{N}\s_-]+/gu, "").trim() || "volunteer"
    saveZahvalnicaDraft(draft)
    if (opts.issuedBy) {
        recordZahvalnicaIssue(draft, opts.issuedBy, opts.print ? "print" : "pdf")
    }

    if (opts.print) {
        pdf.autoPrint()
        const blob = pdf.output("blob")
        const url = URL.createObjectURL(blob)
        const w = window.open(url, "_blank")
        if (!w) {
            // popup blocked — fall back to download
            pdf.save(`zahvalnica-${safeName}.pdf`)
        }
        return
    }

    pdf.save(`zahvalnica-${safeName}.pdf`)
}
