import { notifications } from "@mantine/notifications"
import { jsPDF as JsPdf } from "jspdf"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import { makeQrDataUrl } from "src/shared/docs/zahvalnicaQr"
import {
    BACKGROUND_COLORS,
    DEFAULT_BACKGROUND,
    DEFAULT_LOGO,
    DEFAULT_SIGNATURE,
    DEFAULT_STAMP,
    MAGNOLIA_FONT_URL,
    MARCK_FONT_URL,
    SIGNATURE_BASE_WIDTH_MM,
    STAMP_BASE_SIZE_MM,
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

/** Make near-black pixels transparent so print/PDF don't show a black square. */
export const punchNearBlackToTransparent = (
    img: HTMLImageElement,
    threshold = 28
): string => {
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return canvas.toDataURL("image/png")
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const px = data.data
    for (let i = 0; i < px.length; i += 4) {
        if (px[i] <= threshold && px[i + 1] <= threshold && px[i + 2] <= threshold) {
            px[i + 3] = 0
        }
    }
    ctx.putImageData(data, 0, 0)
    return canvas.toDataURL("image/png")
}

const toPngDataUrl = (img: HTMLImageElement, knockoutBlack = false): string => {
    if (knockoutBlack) return punchNearBlackToTransparent(img)
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext("2d")?.drawImage(img, 0, 0)
    return canvas.toDataURL("image/png")
}

const imageDataUrlWithOpacity = async (
    src: string,
    opacity: number,
    maxPx = 2200
): Promise<{ dataUrl: string; width: number; height: number } | null> => {
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
    return { dataUrl: canvas.toDataURL("image/png"), width: w, height: h }
}

/** Cover-fit rectangle into page, then apply uniform scale around center. */
const coverRect = (
    pageW: number,
    pageH: number,
    imgW: number,
    imgH: number,
    scalePct: number
) => {
    const cover = Math.max(pageW / imgW, pageH / imgH)
    const s = cover * (Math.min(140, Math.max(40, scalePct)) / 100)
    const w = imgW * s
    const h = imgH * s
    return { x: (pageW - w) / 2, y: (pageH - h) / 2, w, h }
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
    // custom font must already be loaded via ensureWebFont("ZahvalnicaCustomTitle", ...)

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
    let hasCustomTitle = false
    if (draft.titleFont === "marck") {
        const marck = await loadFontBase64(MARCK_FONT_URL)
        if (marck) {
            pdf.addFileToVFS("MarckScript-Regular.ttf", marck)
            pdf.addFont("MarckScript-Regular.ttf", "MarckScript", "normal")
            hasMarck = true
        }
    }
    if (draft.titleFont === "custom" && draft.customTitleFontData) {
        const isTtf =
            draft.customTitleFontData.includes("font/ttf") ||
            draft.customTitleFontData.includes("application/x-font-ttf") ||
            /\.ttf/i.test(draft.customTitleFontName) ||
            draft.customTitleFontData.startsWith("data:application/octet-stream")
        const isOtf = /\.otf/i.test(draft.customTitleFontName) || draft.customTitleFontData.includes("font/otf")
        if (isTtf && !isOtf) {
            try {
                const b64 = draft.customTitleFontData.includes(",")
                    ? draft.customTitleFontData.split(",")[1]
                    : draft.customTitleFontData
                pdf.addFileToVFS("CustomTitle.ttf", b64)
                pdf.addFont("CustomTitle.ttf", "CustomTitle", "normal")
                hasCustomTitle = true
            } catch {
                hasCustomTitle = false
            }
        }
        await ensureWebFont("ZahvalnicaCustomTitle", draft.customTitleFontData)
    }

    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const theme = BACKGROUND_COLORS[draft.background] || BACKGROUND_COLORS.white
    const [pr, pg, pb] = theme.page

    pdf.setFillColor(pr, pg, pb)
    pdf.rect(0, 0, pageW, pageH, "F")

    const watermarkSrc = draft.backgroundImageSrc || DEFAULT_BACKGROUND
    const opacity = draft.backgroundOpacity ?? 100
    const wmScale = draft.watermarkScale ?? 100
    if (watermarkSrc && opacity > 0) {
        const faded = await imageDataUrlWithOpacity(watermarkSrc, opacity)
        if (faded) {
            try {
                const box = coverRect(pageW, pageH, faded.width, faded.height, wmScale)
                pdf.addImage(faded.dataUrl, "PNG", box.x, box.y, box.w, box.h, undefined, "FAST")
            } catch {
                /* ignore */
            }
        }
    }

    // Decorative double frame sits above the page template
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
            const logoData = toPngDataUrl(logoImg, true)
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
    } else if (draft.titleFont === "custom" && hasCustomTitle) {
        pdf.setFont("CustomTitle", "normal")
        pdf.setFontSize(ty.title.size)
        const [r, g, b] = hexToRgb(ty.title.color)
        pdf.setTextColor(r, g, b)
        pdf.text(draft.title, pageW / 2, y, { align: "center", maxWidth: contentW })
        y += Math.max(14, ty.title.size * 0.5 + 4)
    } else if (draft.titleFont === "montserrat") {
        applyStyle(pdf, ty.title)
        pdf.text(draft.title, pageW / 2, y, { align: "center", maxWidth: contentW })
        y += Math.max(12, ty.title.size * 0.45 + 4)
    } else {
        const rasterFont: ZahvalnicaTitleFont =
            draft.titleFont === "custom" ? "custom" : draft.titleFont === "magnolia" ? "magnolia" : "marck"
        if (draft.titleFont === "custom" && draft.customTitleFontData) {
            await ensureWebFont("ZahvalnicaCustomTitle", draft.customTitleFontData)
        }
        const raster = await rasterizeTitle(draft.title, rasterFont, ty.title, contentW)
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

    const sigScale = Math.min(120, Math.max(10, draft.signatureScale ?? 35)) / 100
    const sigOffX = draft.signatureOffsetX ?? 0
    const sigOffY = draft.signatureOffsetY ?? 0
    let sigBottom = y

    if (draft.showSignature) {
        const sig = await loadImageElement(draft.signatureSrc || DEFAULT_SIGNATURE)
        if (sig) {
            try {
                const sigData = toPngDataUrl(sig, false)
                const sigW = SIGNATURE_BASE_WIDTH_MM * sigScale
                const sigH = (sig.height / sig.width) * sigW
                const sigX = signCenterX - sigW / 2 + sigOffX
                const sigY = y + sigOffY
                pdf.addImage(sigData, "PNG", sigX, sigY, sigW, sigH, undefined, "FAST")
                sigBottom = Math.max(sigBottom, sigY + sigH)
                y = Math.max(y + 2, sigY + sigH + 2)
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
                const stampData = toPngDataUrl(stamp, true)
                const stampScale = Math.min(140, Math.max(20, draft.stampScale ?? 85)) / 100
                const stampW = STAMP_BASE_SIZE_MM * stampScale
                const stampX = signCenterX + (draft.stampOffsetX ?? 18)
                const stampY = sigBottom + (draft.stampOffsetY ?? -8) - stampW * 0.55
                pdf.addImage(stampData, "PNG", stampX, stampY, stampW, stampW, undefined, "FAST")
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
