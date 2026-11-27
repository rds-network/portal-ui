import dayjs from "dayjs"
import { saveAs } from "file-saver"
import { jsPDF as JsPdf } from "jspdf"
import { AnnualCertificateDto, YearReviewStatsDto } from "src/shared/api/YearReviewApiService"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import { qrcodegen } from "src/shared/docs/qrcodegen"

const bodySr = (year: number) =>
    `Za aktivan doprinos radu udruženja „Ruska dijaspora u Srbiji“ i platforme RADIMO tokom ${year}. godine, odgovornost, inicijativu i podršku zajednici.`

const drawQr = (pdf: JsPdf, text: string, x: number, y: number, size: number) => {
    const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.LOW)
    const quiet = 2
    const cells = qr.size + quiet * 2
    const cell = size / cells
    pdf.setFillColor("#ffffff")
    pdf.rect(x, y, size, size, "F")
    pdf.setFillColor("#000000")
    for (let row = 0; row < qr.size; row++) {
        for (let col = 0; col < qr.size; col++) {
            if (!qr.getModule(col, row)) continue
            pdf.rect(x + (col + quiet) * cell, y + (row + quiet) * cell, cell, cell, "F")
        }
    }
}

export async function generateAnnualZahvalnicaPdf(params: {
    certificate: AnnualCertificateDto
    stats: YearReviewStatsDto
    download?: boolean
}): Promise<Blob> {
    const { certificate, stats } = params
    const pdf = new JsPdf({ orientation: "p", unit: "mm", format: "a4", compress: true })
    pdf.addFileToVFS("Montserrat-Medium-normal.ttf", MONTSERRAT_MEDIUM_NORMAL)
    pdf.addFont("Montserrat-Medium-normal.ttf", "Montserrat-Medium", "normal")
    pdf.addFileToVFS("Montserrat-Bold-bold.ttf", MONTSERRAT_BOLD_BOLD)
    pdf.addFont("Montserrat-Bold-bold.ttf", "Montserrat-Bold", "bold")

    const w = pdf.internal.pageSize.getWidth()
    const h = pdf.internal.pageSize.getHeight()

    pdf.setFillColor(248, 251, 255)
    pdf.rect(0, 0, w, h, "F")
    pdf.setDrawColor(32, 106, 134)
    pdf.setLineWidth(1.2)
    pdf.roundedRect(10, 10, w - 20, h - 20, 3, 3, "S")

    pdf.setFillColor(200, 16, 46)
    pdf.rect(14, 14, 18, 4, "F")
    pdf.setFillColor(12, 64, 128)
    pdf.rect(34, 14, 18, 4, "F")
    pdf.setFillColor(255, 255, 255)
    pdf.setDrawColor(12, 64, 128)
    pdf.rect(54, 14, 18, 4, "S")

    pdf.setFont("Montserrat-Bold", "bold")
    pdf.setTextColor(26, 43, 72)
    pdf.setFontSize(11)
    pdf.text("UDRUŽENJE „RUSKA DIJASPORA U SRBIJI“", w / 2, 28, { align: "center" })
    pdf.setFontSize(28)
    pdf.setTextColor(32, 106, 134)
    pdf.text("ZAHVALNICA", w / 2, 48, { align: "center" })

    pdf.setFont("Montserrat-Medium", "normal")
    pdf.setTextColor(26, 43, 72)
    pdf.setFontSize(11)
    const programName =
        stats.programNameSr?.trim() ||
        stats.programNameRu?.trim() ||
        stats.programNameEn?.trim() ||
        "RADIMO"
    pdf.text(`Super-učesnik programa ${programName}`, w / 2, 58, { align: "center" })

    pdf.setFont("Montserrat-Bold", "bold")
    pdf.setFontSize(18)
    const name = certificate.recipientFullName || stats.displayName
    pdf.text(name, w / 2, 78, { align: "center" })

    pdf.setFont("Montserrat-Medium", "normal")
    pdf.setFontSize(11)
    const lines = pdf.splitTextToSize(bodySr(certificate.year), w - 48) as string[]
    pdf.text(lines, w / 2, 92, { align: "center" })

    const hours = stats.hoursWorked ?? 0
    const reasonParts = [...certificate.qualificationReasons]
    if (hours > 0) reasonParts.push(`${hours} sati za godinu`)
    if (stats.acceptedReports > 0) {
        const reportsLine = `${stats.acceptedReports} prihvaćenih izveštaja`
        if (!reasonParts.some((r) => r.includes("отчёт") || r.toLowerCase().includes("izveštaj"))) {
            reasonParts.unshift(reportsLine)
        }
    }
    const reasons = reasonParts.join(" · ")
    if (reasons) {
        pdf.setFontSize(9)
        pdf.setTextColor(64, 179, 162)
        pdf.text(reasons, w / 2, 118, { align: "center", maxWidth: w - 48 })
    }

    pdf.setTextColor(26, 43, 72)
    pdf.setFontSize(10)
    pdf.text("Predsednik udruženja", w - 28, 165, { align: "right" })
    pdf.setFont("Montserrat-Bold", "bold")
    pdf.text("Leonid Stecenko", w - 28, 172, { align: "right" })

    const origin = typeof window !== "undefined" ? window.location.origin : "https://portal.russian.rs"
    const verifyUrl = `${origin}/verify/certificate/${certificate.verificationToken}`
    drawQr(pdf, verifyUrl, 18, 155, 28)

    pdf.setFont("Montserrat-Medium", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(90, 110, 130)
    pdf.text(`Broj: ${certificate.certificateNumber}`, 18, 190)
    pdf.text(`Datum: ${dayjs(certificate.issuedAt).format("DD.MM.YYYY.")}`, 18, 195)
    pdf.text(`Provera QR / ${verifyUrl}`, 18, 200, { maxWidth: w - 40 })

    const blob = pdf.output("blob")
    if (params.download !== false) {
        saveAs(blob, `Zahvalnica_RADIMO_${certificate.year}_${name.replace(/\s+/g, "_")}.pdf`)
    }
    return blob
}
