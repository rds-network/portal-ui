import { notifications } from "@mantine/notifications"
import { jsPDF as JsPdf } from "jspdf"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import {
    BACKGROUND_COLORS,
    DEFAULT_LOGO,
    ZahvalnicaDraft,
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

/** Rasterize image with alpha for jsPDF (no reliable GState opacity). */
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

export default async function generateZahvalnicaPdf(draft: ZahvalnicaDraft) {
    const volunteerName = draft.volunteerName.trim()
    if (!volunteerName) {
        notifications.show({
            ...ErrorNotification,
            message: "Укажите имя волонтёра",
        })
        throw new Error("volunteerName required")
    }

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
    const colors = BACKGROUND_COLORS[draft.background] || BACKGROUND_COLORS.white
    const [pr, pg, pb] = colors.page
    const [tr, tg, tb] = colors.text
    const [ar, ag, ab] = colors.accent

    pdf.setFillColor(pr, pg, pb)
    pdf.rect(0, 0, pageW, pageH, "F")

    const watermarkSrc = draft.backgroundImageSrc || DEFAULT_LOGO
    const opacity = draft.backgroundOpacity ?? 12
    if (watermarkSrc && opacity > 0) {
        const faded = await imageDataUrlWithOpacity(watermarkSrc, opacity)
        if (faded) {
            try {
                // Centered watermark, ~55% of page width
                const wmW = pageW * 0.55
                const wmH = wmW
                pdf.addImage(faded, "PNG", (pageW - wmW) / 2, (pageH - wmH) / 2 - 8, wmW, wmH, undefined, "FAST")
            } catch {
                /* ignore */
            }
        }
    }

    pdf.setDrawColor(ar, ag, ab)
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
            const ctx = canvas.getContext("2d")
            ctx?.drawImage(logoImg, 0, 0)
            const logoData = canvas.toDataURL("image/png")
            const logoW = 32
            const logoH = 32
            pdf.addImage(logoData, "PNG", (pageW - logoW) / 2, y, logoW, logoH, undefined, "FAST")
            y += logoH + 8
        } catch {
            y += 4
        }
    }

    pdf.setFont("Montserrat-Bold", "bold")
    pdf.setFontSize(11)
    pdf.setTextColor(ar, ag, ab)
    pdf.text(draft.orgTitle, pageW / 2, y, { align: "center", maxWidth: contentW })
    y += 14

    pdf.setFontSize(26)
    pdf.setTextColor(tr, tg, tb)
    pdf.text(draft.title, pageW / 2, y, { align: "center" })
    y += 16

    pdf.setDrawColor(ar, ag, ab)
    pdf.setLineWidth(0.35)
    pdf.line(pageW / 2 - 28, y, pageW / 2 + 28, y)
    y += 14

    pdf.setFont("Montserrat-Bold", "bold")
    pdf.setFontSize(18)
    pdf.setTextColor(ar, ag, ab)
    pdf.text(volunteerName, pageW / 2, y, { align: "center", maxWidth: contentW })
    y += 14

    pdf.setFont("Montserrat-Medium", "normal")
    pdf.setFontSize(11)
    pdf.setTextColor(tr, tg, tb)

    const writeBlock = (text: string, gap = 8) => {
        const lines = pdf.splitTextToSize(text.trim(), contentW)
        pdf.text(lines, pageW / 2, y, { align: "center" })
        y += lines.length * 5.5 + gap
    }

    if (draft.intro.trim()) writeBlock(draft.intro)
    if (draft.contribution.trim()) {
        writeBlock(`Посебну захвалност изражавамо за ${draft.contribution.trim()}.`)
    }
    if (draft.closing.trim()) writeBlock(draft.closing, 16)

    y = Math.max(y, pageH - 55)
    pdf.setFont("Montserrat-Medium", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(tr, tg, tb)
    pdf.text(draft.presidentLabel, pageW / 2, y, { align: "center" })
    y += 7
    pdf.setFont("Montserrat-Bold", "bold")
    pdf.setFontSize(12)
    pdf.setTextColor(ar, ag, ab)
    pdf.text(draft.presidentName.trim() || "—", pageW / 2, y, { align: "center" })

    y = pageH - 28
    pdf.setFont("Montserrat-Medium", "normal")
    pdf.setFontSize(9)
    pdf.setTextColor(tr, tg, tb)
    pdf.text(`${draft.place}, ${draft.dateLabel}`, marginX, y)
    pdf.text(`Број: ${draft.number}`, pageW - marginX, y, { align: "right" })

    const safeName = volunteerName.replace(/[^\p{L}\p{N}\s_-]+/gu, "").trim() || "volunteer"
    pdf.save(`zahvalnica-${safeName}.pdf`)
    saveZahvalnicaDraft(draft)
}
