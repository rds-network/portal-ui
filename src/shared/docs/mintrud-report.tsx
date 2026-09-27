import { PDFDocument, PDFFont, PDFForm, TextAlignment } from "pdf-lib"
import { saveAs } from "file-saver"
import fontkit from "@pdf-lib/fontkit"
import { Statistics } from "@rds-network/portal-api-axios"
import { FIELDS } from "src/shared/constants/Mintrud-fields"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"

const FONT_SIZE = {
    xs: 5,
    sm: 7,
    md: 10,
    lg: 12,
}

/**
 * Generate Mintrud report PDF
 */
export default async function generateMintrudReport(stats: Statistics | undefined, otherDisplayValue: number) {
    if (!stats) {
        throw new Error("Statistics are required to generate Mintrud report")
    }

    // Load template
    const templateBytes = await fetch("/resources/mintrudreport.pdf").then((r) => r.arrayBuffer())

    const pdfDoc = await PDFDocument.load(templateBytes)

    pdfDoc.registerFontkit(fontkit)

    const form = pdfDoc.getForm()

    // Load fonts
    const { bold, regular } = await loadFonts(pdfDoc)

    // ---- Fill fields ----

    // ---- PAGE 1 ----

    setText(form, FIELDS.REPORT_YEAR, String(stats.year ?? ""), bold, false, true)

    setText(form, FIELDS.ORGANIZATION_NAME, "Удружене грађана «РУСКА ДИЈАСПОРА У СРБИJИ»", bold)

    setText(form, FIELDS.ADDRESS, "Нови Сад Шарпланинска,54", bold)

    setText(form, FIELDS.PHONE, "062 154-78-93", bold)

    setText(form, FIELDS.REGISTRY_NUMBER, "10/2023", bold)

    setText(form, FIELDS.REGISTRY_DATE, "08052023", bold)

    setCheckBox(form, FIELDS.ASSOCIATION_CHECK)

    setText(form, FIELDS.PROGRAMS_MEDIA_AND_COMMUNICATIONS_NUMBER, "  1", regular)

    setText(form, FIELDS.PROGRAMS_ENVIRONMENTAL_PROTECTION_NUMBER, "  1", regular)

    setText(form, FIELDS.PROGRAMS_SOCIAL_PROTECTION_NUMBER, "  1", regular)

    setText(form, FIELDS.PROGRAMS_OTHER_NUMBER, "  1", regular)

    setText(
        form,
        FIELDS.PROGRAMS_MEDIA_AND_COMMUNICATIONS_VOLUNTEERS,
        String(getProgramStatsByCode(stats, "MEDIJI_I_KOMUNIKACIJE").count),
        regular
    )

    setText(
        form,
        FIELDS.PROGRAMS_MEDIA_AND_COMMUNICATIONS_TIME,
        String(getProgramStatsByCode(stats, "MEDIJI_I_KOMUNIKACIJE").totalTimeSpent),
        regular,
        true
    )

    setText(
        form,
        FIELDS.PROGRAMS_ENVIRONMENTAL_PROTECTION_VOLUNTEERS,
        String(getProgramStatsByCode(stats, "ZIVOTNA_SREDINA").count),
        regular
    )

    setText(
        form,
        FIELDS.PROGRAMS_ENVIRONMENTAL_PROTECTION_TIME,
        String(getProgramStatsByCode(stats, "ZIVOTNA_SREDINA").totalTimeSpent),
        regular,
        true
    )

    setText(
        form,
        FIELDS.PROGRAMS_SOCIAL_PROTECTION_VOLUNTEERS,
        String(getProgramStatsByCode(stats, "SOCIJALNA_ZASTITA").count),
        regular
    )

    setText(
        form,
        FIELDS.PROGRAMS_SOCIAL_PROTECTION_TIME,
        String(getProgramStatsByCode(stats, "SOCIJALNA_ZASTITA").totalTimeSpent),
        regular,
        true
    )

    setText(form, FIELDS.PROGRAMS_OTHER_VOLUNTEERS, otherDisplayValue.toString(), regular)

    setText(form, FIELDS.PROGRAMS_OTHER_TIME, String(getProgramStatsByCode(stats, null).totalTimeSpent), regular, true)

    setText(form, FIELDS.PROGRAMS_VOLUNTEERS, String(stats.finalUsersStatistics?.totalCount ?? ""), regular)

    setText(form, FIELDS.PROGRAMS_TIME, String(stats.programStatistics?.total.totalTimeSpent ?? ""), regular, true)

    // ---- PAGE 2 ----

    setText(form, FIELDS.VOLUNTEERS_FEMALE_COUNT, String(stats.volunteerStatistics?.femaleCount ?? "0"), regular)

    setText(form, FIELDS.VOLUNTEERS_MALE_COUNT, String(stats.volunteerStatistics?.maleCount ?? "0"), regular)

    setText(form, FIELDS.VOLUNTEERS_15_18, String(stats.volunteerStatistics?.age15to18Count ?? "0"), regular)

    setText(form, FIELDS.VOLUNTEERS_18_30, String(stats.volunteerStatistics?.age18to30Count ?? "0"), regular)

    setText(form, FIELDS.VOLUNTEERS_30_40, String(stats.volunteerStatistics?.age30to40Count ?? "0"), regular)

    setText(form, FIELDS.VOLUNTEERS_40_65, String(stats.volunteerStatistics?.age40to65Count ?? "0"), regular)

    setText(form, FIELDS.VOLUNTEERS_65_PLUS, String(stats.volunteerStatistics?.age65AndAboveCount ?? "0"), regular)

    setText(form, FIELDS.VOLUNTEERS_CITIZENS, String(stats.volunteerStatistics?.citizensCount ?? "0"), regular)

    setText(form, FIELDS.VOLUNTEERS_FOREIGNERS, String(stats.volunteerStatistics?.foreignersCount ?? "0"), regular)

    setText(form, FIELDS.VOLUNTEERS_TOTAL, String(stats.finalUsersStatistics?.totalCount ?? "0"), regular)

    setText(form, FIELDS.FINAL_USERS_CULTURE_NUMBER, "1", regular)

    setText(
        form,
        FIELDS.FINAL_USERS_CULTURE_COUNT,
        String(stats.finalUsersStatistics?.culturalAssetsCount ?? "0"),
        regular
    )

    setText(form, FIELDS.FINAL_USERS_NATURAL_NUMBER, "1", regular)

    setText(
        form,
        FIELDS.FINAL_USERS_NATURAL_COUNT,
        String(stats.finalUsersStatistics?.naturalAssetsCount ?? "0"),
        regular
    )

    setText(form, FIELDS.FINAL_USERS_PUBLIC_NUMBER, "1", regular)

    setText(form, FIELDS.FINAL_USERS_PUBLIC_COUNT, String(stats.finalUsersStatistics?.publicAreasCount ?? "0"), regular)

    setText(form, FIELDS.FINAL_USERS_OTHER_NUMBER, "1", regular)

    setText(form, FIELDS.FINAL_USERS_OTHER_COUNT, String(stats.finalUsersStatistics?.otherCount ?? "0"), regular)

    setText(form, FIELDS.FINAL_USERS_TOTAL_NUMBER, "4", regular)

    setText(form, FIELDS.FINAL_USERS_TOTAL_COUNT, String(stats.finalUsersStatistics?.totalCount ?? "0"), regular)

    setText(form, FIELDS.TOTAL_USERS, String(stats.finalUsersStatistics?.totalCount ?? "0"), regular)

    setText(form, FIELDS.RESPONSIBLE_FULL_NAME, "Леонид Стеценко", regular)

    // ---- generation ----
    form.flatten()

    const pdfBytes = await pdfDoc.save()

    saveAs(new Blob([pdfBytes], { type: "application/pdf" }), `mintrud-report-${stats.year}.pdf`)
}

/**
 * Load Unicode fonts properly
 */
async function loadFonts(pdfDoc: PDFDocument): Promise<{
    bold: PDFFont
    regular: PDFFont
}> {
    const bold = await pdfDoc.embedFont(
        Uint8Array.from(atob(MONTSERRAT_BOLD_BOLD), (c) => c.charCodeAt(0)),
        { subset: true }
    )

    const regular = await pdfDoc.embedFont(
        Uint8Array.from(atob(MONTSERRAT_MEDIUM_NORMAL), (c) => c.charCodeAt(0)),
        { subset: true }
    )

    return { bold, regular }
}

/**
 * Unicode-safe AcroForm text setter
 */
function setText(form: PDFForm, fieldName: string, value: string, font: PDFFont, flexibleText = false, title = false) {
    const field = form.getTextField(fieldName)

    field.setText(value)

    let fontSize = FONT_SIZE.md

    if (value) {
        if (title) {
            fontSize = FONT_SIZE.lg
        } else if (flexibleText) {
            const length = value.length

            if (length > 4) {
                fontSize = FONT_SIZE.xs
            } else if (length > 2) {
                fontSize = FONT_SIZE.sm
            }
        }
    }

    field.setAlignment(TextAlignment.Center)
    field.setFontSize(fontSize)
    field.updateAppearances(font)
}

function setCheckBox(form: PDFForm, fieldName: string) {
    const checkBox = form.getCheckBox(fieldName)
    checkBox.check()
}

const KNOWN_PROGRAM_CODES = ["MEDIJI_I_KOMUNIKACIJE", "ZIVOTNA_SREDINA", "SOCIJALNA_ZASTITA"] as const

type ProgramStatsResult = {
    count: number
    totalTimeSpent: number
}

function getProgramStatsByCode(stats: Statistics, code: string | null): ProgramStatsResult {
    const items = stats.programStatistics?.items ?? []

    const item = items.find((i) => {
        if (code == null) {
            // ловим и null, и undefined, и (на будущее) возможный строковый OTHER
            return i.code == null || i.code === "OTHER"
        }
        return i.code === code
    })

    if (item?.data) {
        return {
            count: item.data.count ?? 0,
            totalTimeSpent: item.data.totalTimeSpent ?? 0,
        }
    }

    if (code == null) {
        const total = stats.programStatistics?.total ?? { count: 0, totalTimeSpent: 0 }

        const knownSum = KNOWN_PROGRAM_CODES.reduce(
            (acc, c) => {
                const x = items.find((i) => i.code === c)?.data
                return {
                    count: acc.count + (x?.count ?? 0),
                    totalTimeSpent: acc.totalTimeSpent + (x?.totalTimeSpent ?? 0),
                }
            },
            { count: 0, totalTimeSpent: 0 }
        )

        return {
            count: Math.max(0, (total.count ?? 0) - knownSum.count),
            totalTimeSpent: Math.max(0, (total.totalTimeSpent ?? 0) - knownSum.totalTimeSpent),
        }
    }

    return { count: 0, totalTimeSpent: 0 }
}
