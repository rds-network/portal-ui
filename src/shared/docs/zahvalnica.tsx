import { notifications } from "@mantine/notifications"
import { jsPDF as JsPdf } from "jspdf"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import {
    BACKGROUND_COLORS,
    ZahvalnicaDraft,
    saveZahvalnicaDraft,
} from "src/shared/docs/zahvalnicaDraft"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"

const loadImageAsDataUrl = async (src: string): Promise<string | null> => {
    try {
        if (src.startsWith("data:")) return src
        const res = await fetch(src)
        if (!res.ok) return null
        const blob = await res.blob()
        return await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

const imageFormat = (dataUrl: string): "JPEG" | "PNG" | "WEBP" => {
    if (dataUrl.includes("image/png")) return "PNG"
    if (dataUrl.includes("image/webp")) return "WEBP"
    return "JPEG"
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
    const colors = BACKGROUND_COLORS[draft.background]
    const [pr, pg, pb] = colors.page
    const [tr, tg, tb] = colors.text
    const [ar, ag, ab] = colors.accent

    // Background: solid theme, or custom image (photo fills page; theme used for text colors)
    if (draft.backgroundImageSrc) {
        const bg = await loadImageAsDataUrl(draft.backgroundImageSrc)
        if (bg) {
            try {
                pdf.addImage(bg, imageFormat(bg), 0, 0, pageW, pageH, undefined, "FAST")
            } catch {
                pdf.setFillColor(pr, pg, pb)
                pdf.rect(0, 0, pageW, pageH, "F")
            }
        } else {
            pdf.setFillColor(pr, pg, pb)
            pdf.rect(0, 0, pageW, pageH, "F")
        }
    } else {
        pdf.setFillColor(pr, pg, pb)
        pdf.rect(0, 0, pageW, pageH, "F")
    }

    pdf.setDrawColor(ar, ag, ab)
    pdf.setLineWidth(0.6)
    pdf.rect(12, 12, pageW - 24, pageH - 24)
    pdf.setLineWidth(0.25)
    pdf.rect(14, 14, pageW - 28, pageH - 28)

    const marginX = 28
    const contentW = pageW - marginX * 2
    let y = 28

    const logoData = await loadImageAsDataUrl(draft.logoSrc || "/resources/zahvalnica-logo.jpg")
    if (logoData) {
        try {
            const logoW = 28
            const logoH = 28
            pdf.addImage(
                logoData,
                imageFormat(logoData),
                (pageW - logoW) / 2,
                y,
                logoW,
                logoH,
                undefined,
                "FAST"
            )
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
