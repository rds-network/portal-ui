import { ReportDto, UserInfoDto } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"
import { jsPDF as JsPdf } from "jspdf"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import { getSpentTimeObject, getSpentTimeObjectFromReport } from "src/shared/report/timeSpent"

export const generateReportsPdf = (
    reports: ReportDto[],
    user: UserInfoDto,
    fromDate: Date | null,
    toDate: Date | null
) => {
    const DATE_FORMAT = "DD.MM.YYYY"
    const birthDate = dayjs(user.birthDate).format(DATE_FORMAT)
    const from = dayjs(errorIfEmpty("Birth date", fromDate?.toString())).format(DATE_FORMAT)
    const to = dayjs(errorIfEmpty("Birth date", toDate?.toString())).format(DATE_FORMAT)

    const pdf = new JsPdf({
        orientation: "p",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        compress: true,
    })

    // Fonts
    pdf.addFileToVFS("Montserrat-Medium-normal.ttf", MONTSERRAT_MEDIUM_NORMAL)
    pdf.addFont("Montserrat-Medium-normal.ttf", "Montserrat-Medium", "normal")
    pdf.addFileToVFS("Montserrat-Bold-bold.ttf", MONTSERRAT_BOLD_BOLD)
    pdf.addFont("Montserrat-Bold-bold.ttf", "Montserrat-Bold", "bold")

    // Layout constants
    const MARGIN_X = 15
    const MARGIN_TOP = 15
    const MARGIN_BOTTOM = 20

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const contentWidth = pageWidth - MARGIN_X * 2

    // Typography
    const TITLE_PT = 11
    const BODY_PT = 8

    let y = MARGIN_TOP
    const ptToMm = (pt: number) => pt * 0.352778
    const lineHeightMm = (pt: number, factor = 1.25) => ptToMm(pt) * factor

    const setBody = () => {
        pdf.setFont("Montserrat-Medium", "normal")
        pdf.setFontSize(BODY_PT)
    }

    const setBold = () => {
        pdf.setFont("Montserrat-Bold", "bold")
    }

    const ensureSpace = (needMm: number) => {
        const bottomLimit = pageHeight - MARGIN_BOTTOM
        if (y + needMm > bottomLimit) {
            pdf.addPage()
            y = MARGIN_TOP
        }
    }

    const writeCentered = (text: string, pt: number, gapAfterMm = 2) => {
        ensureSpace(lineHeightMm(pt) + gapAfterMm)
        setBold()
        pdf.setFontSize(pt)
        pdf.text(text, pageWidth / 2, y, { align: "center" })
        y += lineHeightMm(pt) + gapAfterMm
    }

    const writeLeft = (left: string, pt: number, gapAfterMm = 2) => {
        ensureSpace(lineHeightMm(pt) + gapAfterMm)
        pdf.setFontSize(pt)
        setBold()
        pdf.text(left, MARGIN_X, y)
        y += lineHeightMm(pt) + gapAfterMm
    }

    const writeInlineBold = (markdown: string, pt: number, gapAfterMm = 2) => {
        const segments = parseBoldMarkdown(markdown)
        pdf.setFontSize(pt)

        const tokens: Array<{ text: string; bold: boolean }> = []
        for (const seg of segments) {
            const parts = seg.text.split(/(\s+)/).filter((p) => p.length > 0)
            for (const part of parts) tokens.push({ text: part, bold: seg.bold })
        }

        const lh = lineHeightMm(pt)
        let lineTokens: Array<{ text: string; bold: boolean }> = []
        let lineW = 0

        const tokenWidth = (t: { text: string; bold: boolean }) => {
            if (t.bold) {
                setBold()
            } else {
                setBody()
            }
            pdf.setFontSize(pt)
            return pdf.getTextWidth(t.text)
        }

        const renderLine = (lt: Array<{ text: string; bold: boolean }>) => {
            ensureSpace(lh + gapAfterMm)
            let x = MARGIN_X
            for (const t of lt) {
                if (t.bold) {
                    setBold()
                } else {
                    setBody()
                }
                pdf.setFontSize(pt)
                pdf.text(t.text, x, y)
                x += pdf.getTextWidth(t.text)
            }
            y += lh
        }

        for (const t of tokens) {
            const w = tokenWidth(t)
            const isOnlySpace = t.text.trim().length === 0
            const wouldOverflow = lineW + w > contentWidth

            if (wouldOverflow && lineTokens.length > 0 && !isOnlySpace) {
                renderLine(lineTokens)
                lineTokens = []
                lineW = 0
            }

            if (lineTokens.length === 0 && isOnlySpace) continue

            lineTokens.push(t)
            lineW += w
        }

        if (lineTokens.length > 0) renderLine(lineTokens)
        y += gapAfterMm
    }

    const writeSpacer = (mm: number) => {
        ensureSpace(mm)
        y += mm
    }

    const writeHr = (thickness = 0.3, dashed = false, gapBeforeMm = 3, gapAfterMm = 3) => {
        const needMm = gapBeforeMm + thickness + gapAfterMm
        ensureSpace(needMm)

        y += gapBeforeMm

        pdf.setLineWidth(thickness)

        if (dashed) {
            pdf.setLineDashPattern([1, 1], 0)
        }

        pdf.line(MARGIN_X, y, pageWidth - MARGIN_X, y)

        y += thickness + gapAfterMm
    }

    //Document

    writeCentered("Udrženje “Ruska Dijaspora u Srbiji”", TITLE_PT, 3)
    writeCentered("Matični broj: 28355122 PIB: 113526376, Telefon 062 154 78 93", BODY_PT, 3)
    writeSpacer(4)
    writeCentered("Izveštaj o obavljenom volonterskom radu", TITLE_PT, 3)
    writeSpacer(4)
    writeLeft("Podaci o volonteru:", TITLE_PT, 3)
    writeInlineBold(
        `Volonter **${user.fullName}**, rođen **${birthDate}**, učesnik programa **${user.program?.nameSr}** na projektu **${user.project?.nameSr}**`,
        BODY_PT,
        3
    )
    writeSpacer(4)
    writeLeft(`Nedeljni izveštaji za period od ${from} do ${to}:`, TITLE_PT, 2)

    reports.forEach((report) => {
        writeHr()
        writeSpacer(2)
        const weekStart = dayjs(report.createTime).startOf("isoWeek").format(DATE_FORMAT)
        const weekEnd = dayjs(report.createTime).endOf("isoWeek").format(DATE_FORMAT)
        const spentTime = getSpentTimeObjectFromReport(report)

        writeInlineBold(`**Nedelja №${report.week}** (${weekStart} - ${weekEnd})`, BODY_PT, 4)
        writeInlineBold(
            `**Datum:** ${dayjs(report.createTime).format(DATE_FORMAT)}, **Ukupno vreme:** ${spentTime.h} sat. ${spentTime.m} min., **Status:** Prihvaćen`,
            BODY_PT,
            2
        )
        writeInlineBold(`**Zadatci:**`, BODY_PT, 2)
        report.tasks.forEach((task, index, array) => {
            writeSpacer(2)
            writeInlineBold(`Zadatak №${index + 1}`, BODY_PT, 1)
            writeInlineBold(`**Naziv:** ${task.nameSr ?? task.name}`, BODY_PT, 1)
            writeInlineBold(`**Opis:** ${task.descriptionSr ?? task.description}`, BODY_PT, 1)
            const timeSpent = getSpentTimeObject(task.timeSpent)
            writeInlineBold(`**Potrošeno vreme:** ${timeSpent.h} sat. ${timeSpent.m} min.`, BODY_PT, 1)
            if (array.length > 1) {
                writeHr(0.2, true)
            }
        })
        writeSpacer(2)
    })
    writeSpacer(14)

    writeLeft(`Datum: ${dayjs().format("DD.MM.YYYY")}`, BODY_PT, 3)
    writeLeft("Predsednik LEONID STECENKO:  ______________  ", BODY_PT, 3)

    pdf.save(`Nedeljni izveštaji - ${user.fullName} (od ${from} do ${to}).pdf`)
}

function parseBoldMarkdown(input: string): Array<{ text: string; bold: boolean }> {
    const parts = input.split("**")
    return parts.map((t, i) => ({ text: t, bold: i % 2 === 1 }))
}

function errorIfEmpty(name: string, str: string | null | undefined): string {
    if (str == null || str === "") {
        alert(name + " is empty")
        throw new Error(name + " is empty")
    }
    return str
}
