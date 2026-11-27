import dayjs from "dayjs"
import { saveAs } from "file-saver"
import { jsPDF as JsPdf } from "jspdf"
import { PointLeaderDto } from "src/shared/api/AchievementsApiService"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import { downloadCsv } from "src/shared/utils/downloadCsv"

export type LeaderboardExportLabels = {
    title: string
    place: string
    name: string
    email: string
    telegram: string
    points: string
    total: string
}

/** Cap must stay ≤ backend MANAGER_LEADERBOARD_CAP. */
export const LEADERBOARD_EXPORT_LIMIT = 10_000

const contact = (row: PointLeaderDto) => ({
    email: row.email?.trim() || "",
    telegram: row.telegram?.trim() || "",
})

export function exportLeaderboardCsv(leaders: PointLeaderDto[], labels: LeaderboardExportLabels) {
    const date = dayjs().format("YYYY-MM-DD")
    downloadCsv(`rating-${date}.csv`, [
        [labels.place, labels.name, labels.email, labels.telegram, labels.points],
        ...leaders.map((row) => {
            const c = contact(row)
            return [row.rank, row.fullName, c.email, c.telegram, row.points]
        }),
    ])
}

export function exportLeaderboardPdf(leaders: PointLeaderDto[], labels: LeaderboardExportLabels) {
    const pdf = new JsPdf({ orientation: "landscape", unit: "mm", format: "a4", compress: true })
    pdf.addFileToVFS("Montserrat-Medium-normal.ttf", MONTSERRAT_MEDIUM_NORMAL)
    pdf.addFont("Montserrat-Medium-normal.ttf", "Montserrat-Medium", "normal")
    pdf.addFileToVFS("Montserrat-Bold-bold.ttf", MONTSERRAT_BOLD_BOLD)
    pdf.addFont("Montserrat-Bold-bold.ttf", "Montserrat-Bold", "bold")

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const marginX = 12
    const marginTop = 14
    const marginBottom = 12
    const colRank = marginX
    const colName = marginX + 14
    const colEmail = marginX + 78
    const colTg = marginX + 168
    const colPts = pageWidth - marginX
    const rowH = 5.8

    let y = marginTop
    const drawHeader = () => {
        pdf.setFont("Montserrat-Bold", "bold")
        pdf.setFontSize(13)
        pdf.text(labels.title, marginX, y)
        y += 5.5
        pdf.setFont("Montserrat-Medium", "normal")
        pdf.setFontSize(9)
        pdf.text(`${dayjs().format("DD.MM.YYYY")} · ${labels.total}: ${leaders.length}`, marginX, y)
        y += 6
        pdf.setFont("Montserrat-Bold", "bold")
        pdf.setFontSize(9)
        pdf.text(labels.place, colRank, y)
        pdf.text(labels.name, colName, y)
        pdf.text(labels.email, colEmail, y)
        pdf.text(labels.telegram, colTg, y)
        pdf.text(labels.points, colPts, y, { align: "right" })
        y += 2.5
        pdf.setDrawColor(180)
        pdf.setLineWidth(0.2)
        pdf.line(marginX, y, pageWidth - marginX, y)
        y += 4.5
        pdf.setFont("Montserrat-Medium", "normal")
        pdf.setFontSize(8.5)
    }

    drawHeader()
    for (const row of leaders) {
        const c = contact(row)
        const name = pdf.splitTextToSize(row.fullName || row.username, colEmail - colName - 3) as string[]
        const email = pdf.splitTextToSize(c.email || "—", colTg - colEmail - 3) as string[]
        const tg = pdf.splitTextToSize(c.telegram || "—", colPts - colTg - 16) as string[]
        const lines = Math.max(name.length, email.length, tg.length, 1)
        if (y + rowH * lines > pageHeight - marginBottom) {
            pdf.addPage()
            y = marginTop
            drawHeader()
        }
        pdf.text(String(row.rank), colRank, y)
        pdf.text(name, colName, y)
        pdf.text(email, colEmail, y)
        pdf.text(tg, colTg, y)
        pdf.text(String(row.points), colPts, y, { align: "right" })
        y += rowH * lines
    }

    saveAs(pdf.output("blob"), `rating-${dayjs().format("YYYY-MM-DD")}.pdf`)
}
