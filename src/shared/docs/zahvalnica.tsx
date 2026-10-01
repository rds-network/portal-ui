import { notifications } from "@mantine/notifications"
import { jsPDF as JsPdf } from "jspdf"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import { makeQrDataUrl } from "src/shared/docs/zahvalnicaQr"
import {
    BACKGROUND_COLORS,
    DEFAULT_LOGO,
    DEFAULT_SIGNATURE,
    DEFAULT_STAMP,
    MAGNOLIA_FONT_URL,
    MARCK_FONT_URL,
    TextStyle,
    TITLE_FONT_CSS,
    ZahvalnicaDraft,
    ZahvalnicaTitleFont,
    hexToRgb,
    recordZahvalnicaIssue,
    saveZahvalnicaDraft,
} from "src/shared/docs/zahvalnicaDraft"
import {
    buildZahvalnicaVerifyUrl,
    encodeZahvalnicaVerifyToken,
} from "src/shared/docs/zahvalnicaVerify"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(binary)
}

const loadFontBase64 = async (url: string): Promise<string | null> => {
    try {
        const res = await fetch(url)
        if (!res.ok) return null
        return arrayBufferToBase64(await res.arrayBuffer())
    } catch {
        return null
    }
}

const ensureWebFont = async (family: string, url: string) => {
    try {
        const face = new FontFace(family, `url(${url})`, { style: "normal", weight: "400" })
        await face.load()
        document.fonts.add(face)
        await document.fonts.ready
    } catch {
        /* ignore */
    }
}

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

const rasterizeTitle = async (
    text: string,
    font: ZahvalnicaTitleFont,
    style: TextStyle,
    maxWidthMm: number
): Promise<{ dataUrl: string; widthMm: number; heightMm: number } | null> => {
    const cssFamily = TITLE_FONT_CSS[font]
    if (font === "marck") await ensureWebFont("Marck Script", MARCK_FONT_URL)
    if (font === "magnolia") await ensureWebFont("Magnolia Script", MAGNOLIA_FONT_URL)

    const pxPerMm = 96 / 25.4
    const fontPx = Math.round(style.size * (96 / 72) * 1.35)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.font = `${style.bold ? "700" : "400"} ${fontPx}px ${cssFamily}`
    const metrics = ctx.measureText(text)
    const pad = Math.ceil(fontPx * 0.35)
    const w = Math.ceil(metrics.width) + pad * 2
    const h = Math.ceil(fontPx * 1.55) + pad
    canvas.width = Math.max(1, w)
    canvas.height = Math.max(1, h)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = `${style.bold ? "700" : "400"} ${fontPx}px ${cssFamily}`
    ctx.fillStyle = style.color
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    let widthMm = canvas.width / pxPerMm
    let heightMm = canvas.height / pxPerMm
    if (widthMm > maxWidthMm) {
        const s = maxWidthMm / widthMm
        widthMm *= s
        heightMm *= s
    }
    return { dataUrl: canvas.toDataURL("image/png"), widthMm, heightMm }
}

const applyStyle = (pdf: JsPdf, style: TextStyle, fontFamily?: string) => {
    if (fontFamily === "MarckScript") {
        pdf.setFont("MarckScript", "normal")
    } else {
        pdf.setFont(style.bold ? "Montserrat-Bold" : "Montserrat-Medium", style.bold ? "bold" : "normal")
    }
    pdf.setFontSize(style.size)
    const [r, g, b] = hexToRgb(style.color)
    pdf.setTextColor(r, g, b)
}

type GenerateOpts = {
    issuedBy?: string
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

    let hasMarck = false
    if (draft.titleFont === "marck") {
        const marck = await loadFontBase64(MARCK_FONT_URL)
        if (marck) {
            pdf.addFileToVFS("MarckScript-Regular.ttf", marck)
            pdf.addFont("MarckScript-Regular.ttf", "MarckScript", "normal")
            hasMarck = true
        }
    }

    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const theme = BACKGROUND_COLORS[draft.background] || BACKGROUND_COLORS.white
    const [pr, pg, pb] = theme.page

    pdf.setFillColor(pr, pg, pb)
    pdf.rect(0, 0, pageW, pageH, "F")

    const watermarkSrc = draft.backgroundImageSrc || DEFAULT_LOGO
    const opacity = draft.backgroundOpacity ?? 12
    const wmScale = Math.min(140, Math.max(40, draft.watermarkScale ?? 95)) / 100
    if (watermarkSrc && opacity > 0) {
        const faded = await imageDataUrlWithOpacity(watermarkSrc, opacity)
        if (faded) {
            try {
                const wmW = pageW * wmScale
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

    if (draft.titleFont === "marck" && hasMarck) {
        applyStyle(pdf, ty.title, "MarckScript")
        pdf.text(draft.title, pageW / 2, y, { align: "center", maxWidth: contentW })
        y += Math.max(14, ty.title.size * 0.5 + 4)
    } else if (draft.titleFont === "montserrat") {
        applyStyle(pdf, ty.title)
        pdf.text(draft.title, pageW / 2, y, { align: "center", maxWidth: contentW })
        y += Math.max(12, ty.title.size * 0.45 + 4)
    } else {
        const raster = await rasterizeTitle(draft.title, draft.titleFont, ty.title, contentW)
        if (raster) {
            pdf.addImage(
                raster.dataUrl,
                "PNG",
                (pageW - raster.widthMm) / 2,
                y - raster.heightMm * 0.55,
                raster.widthMm,
                raster.heightMm,
                undefined,
                "FAST"
            )
            y += raster.heightMm * 0.65 + 4
        } else {
            applyStyle(pdf, ty.title)
            pdf.text(draft.title, pageW / 2, y, { align: "center", maxWidth: contentW })
            y += Math.max(12, ty.title.size * 0.45 + 4)
        }
    }

    pdf.setDrawColor(frameColor[0], frameColor[1], frameColor[2])
    pdf.setLineWidth(0.35)
    pdf.line(pageW / 2 - 28, y, pageW / 2 + 28, y)
    y += 12

    applyStyle(pdf, ty.name)
    pdf.text(volunteerName, pageW / 2, y, { align: "center", maxWidth: contentW })
    y += Math.max(12, ty.name.size * 0.45 + 4)

    const lineH = Math.max(1.1, Math.min(2.4, draft.bodyLineHeight ?? 1.55))
    const writeBlock = (text: string, gap = 8) => {
        applyStyle(pdf, ty.body)
        const lines = pdf.splitTextToSize(text.trim(), contentW) as string[]
        const leading = ty.body.size * 0.3528 * lineH
        pdf.text(lines, pageW / 2, y, { align: "center", lineHeightFactor: lineH })
        y += lines.length * Math.max(leading, ty.body.size * 0.38 * lineH) + gap
    }

    if (draft.intro.trim()) writeBlock(draft.intro)
    if (draft.contribution.trim()) {
        writeBlock(`Посебну захвалност изражавамо за ${draft.contribution.trim()}.`)
    }
    if (draft.closing.trim()) writeBlock(draft.closing, 16)

    y = Math.max(y, pageH - 62)
    const signCenterX = pageW / 2
    applyStyle(pdf, { ...ty.sign, bold: false, size: Math.max(8, ty.sign.size - 2) })
    pdf.text(draft.presidentLabel, signCenterX, y, { align: "center" })
    y += 4

    if (draft.showSignature) {
        const sig = await loadImageElement(draft.signatureSrc || DEFAULT_SIGNATURE)
        if (sig) {
            try {
                const canvas = document.createElement("canvas")
                canvas.width = sig.width
                canvas.height = sig.height
                canvas.getContext("2d")?.drawImage(sig, 0, 0)
                const sigW = 42
                const sigH = (sig.height / sig.width) * sigW
                pdf.addImage(
                    canvas.toDataURL("image/png"),
                    "PNG",
                    signCenterX - sigW / 2,
                    y,
                    sigW,
                    sigH,
                    undefined,
                    "FAST"
                )
                y += sigH + 2
            } catch {
                y += 2
            }
        }
    }

    applyStyle(pdf, ty.sign)
    pdf.text(draft.presidentName.trim() || "—", signCenterX, y, { align: "center" })

    if (draft.showStamp) {
        const stamp = await loadImageElement(draft.stampSrc || DEFAULT_STAMP)
        if (stamp) {
            try {
                const canvas = document.createElement("canvas")
                canvas.width = stamp.width
                canvas.height = stamp.height
                canvas.getContext("2d")?.drawImage(stamp, 0, 0)
                const stampW = 38
                pdf.addImage(
                    canvas.toDataURL("image/png"),
                    "PNG",
                    signCenterX + 18,
                    y - 28,
                    stampW,
                    stampW,
                    undefined,
                    "FAST"
                )
            } catch {
                /* ignore */
            }
        }
    }

    const issueId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const issuedAt = new Date().toISOString()
    const verifyToken = encodeZahvalnicaVerifyToken({
        v: 1,
        id: issueId,
        name: volunteerName,
        number: draft.number,
        date: draft.dateLabel,
        place: draft.place,
        contribution: draft.contribution.trim(),
        president: draft.presidentName.trim(),
        issuedAt,
    })
    const verifyUrl = buildZahvalnicaVerifyUrl(verifyToken)

    const metaY = pageH - 28
    if (draft.showQr) {
        try {
            const qrData = makeQrDataUrl(verifyUrl, 2, 1)
            const qrSize = 18
            pdf.addImage(qrData, "PNG", marginX, pageH - 24 - qrSize, qrSize, qrSize, undefined, "FAST")
            applyStyle(pdf, { ...ty.meta, size: Math.max(7, ty.meta.size - 1) })
            pdf.text("провера", marginX + qrSize / 2, pageH - 20, { align: "center" })
            applyStyle(pdf, ty.meta)
            pdf.text(`${draft.place}, ${draft.dateLabel}`, marginX + qrSize + 6, metaY)
        } catch {
            applyStyle(pdf, ty.meta)
            pdf.text(`${draft.place}, ${draft.dateLabel}`, marginX, metaY)
        }
    } else {
        applyStyle(pdf, ty.meta)
        pdf.text(`${draft.place}, ${draft.dateLabel}`, marginX, metaY)
    }
    applyStyle(pdf, ty.meta)
    pdf.text(`Број: ${draft.number}`, pageW - marginX, metaY, { align: "right" })

    const safeName = volunteerName.replace(/[^\p{L}\p{N}\s_-]+/gu, "").trim() || "volunteer"
    saveZahvalnicaDraft(draft)
    if (opts.issuedBy) {
        recordZahvalnicaIssue(draft, opts.issuedBy, opts.print ? "print" : "pdf", verifyToken, issueId)
    }

    if (opts.print) {
        pdf.autoPrint()
        const blob = pdf.output("blob")
        const url = URL.createObjectURL(blob)
        const w = window.open(url, "_blank")
        if (!w) {
            pdf.save(`zahvalnica-${safeName}.pdf`)
        }
        return
    }

    pdf.save(`zahvalnica-${safeName}.pdf`)
}
