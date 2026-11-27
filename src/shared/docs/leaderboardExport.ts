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
    username: string
    points: string
    total: string
}

/** Cap must stay ≤ backend MANAGER_LEADERBOARD_CAP. */
export const LEADERBOARD_EXPORT_LIMIT = 10_000

export function exportLeaderboardCsv(leaders: PointLeaderDto[], labels: LeaderboardExportLabels) {
    const date = dayjs().format("YYYY-MM-DD")
    downloadCsv(`rating-${date}.csv`, [
        [labels.place, labels.name, labels.username, labels.points],
        ...leaders.map((row) => [row.rank, row.fullName, row.username, row.points]),
    ])
}

export function exportLeaderboardPdf(leaders: PointLeaderDto[], labels: LeaderboardExportLabels) {
    const pdf = new JsPdf({ orientation: "p", unit: "mm", format: "a4", compress: true })
    pdf.addFileToVFS("Montserrat-Medium-normal.ttf", MONTSERRAT_MEDIUM_NORMAL)
    pdf.addFont("Montserrat-Medium-normal.ttf", "Montserrat-Medium", "normal")
    pdf.addFileToVFS("Montserrat-Bold-bold.ttf", MONTSERRAT_BOLD_BOLD)
    pdf.addFont("Montserrat-Bold-bold.ttf", "Montserrat-Bold", "bold")

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const marginX = 14
    const marginTop = 16
    const marginBottom = 14
    const colRank = marginX
    const colName = marginX + 18
    const colUser = marginX + 110
    const colPts = pageWidth - marginX
    const rowH = 6.2

    let y = marginTop
    const drawHeader = () => {
        pdf.setFont("Montserrat-Bold", "bold")
        pdf.setFontSize(13)
        pdf.text(labels.title, marginX, y)
        y += 6
        pdf.setFont("Montserrat-Medium", "normal")
        pdf.setFontSize(9)
        pdf.text(
            `${dayjs().format("DD.MM.YYYY")} · ${labels.total}: ${leaders.length}`,
            marginX,
            y
        )
        y += 7
        pdf.setFont("Montserrat-Bold", "bold")
        pdf.setFontSize(9)
        pdf.text(labels.place, colRank, y)
        pdf.text(labels.name, colName, y)
        pdf.text(labels.username, colUser, y)
        pdf.text(labels.points, colPts, y, { align: "right" })
        y += 3
        pdf.setDrawColor(180)
        pdf.setLineWidth(0.2)
        pdf.line(marginX, y, pageWidth - marginX, y)
        y += 5
        pdf.setFont("Montserrat-Medium", "normal")
        pdf.setFontSize(9)
    }

    drawHeader()
    for (const row of leaders) {
        if (y + rowH > pageHeight - marginBottom) {
            pdf.addPage()
            y = marginTop
            drawHeader()
        }
        const name = pdf.splitTextToSize(row.fullName || row.username, colUser - colName - 4) as string[]
        const user = pdf.splitTextToSize(row.username, colPts - colUser - 14) as string[]
        const lines = Math.max(name.length, user.length, 1)
        pdf.text(String(row.rank), colRank, y)
        pdf.text(name, colName, y)
        pdf.text(user, colUser, y)
        pdf.text(String(row.points), colPts, y, { align: "right" })
        y += rowH * lines
    }

    saveAs(pdf.output("blob"), `rating-${dayjs().format("YYYY-MM-DD")}.pdf`)
}
