import { notifications } from "@mantine/notifications"
import fontkit from "@pdf-lib/fontkit"

import dayjs from "dayjs"
import { saveAs } from "file-saver"
import { PDFDocument, rgb } from "pdf-lib"
import { DEJAVU_SANS } from "src/shared/docs/fonts/DejaVuSans"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import { fillQuestionnairePage } from "src/shared/docs/questionnaire"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { getFullAddress } from "src/shared/utils/getFullAddress"
import { ApplicationDto, GenderEnumDto, ProgramDto } from "@rds-network/portal-api-axios"

const PROJECT_TO_STAT_GROUP: Record<string, string> = {
    LAWS: "SOCIJALNA_ZASTITA",
    SMM: "MEDIJI_I_KOMUNIKACIJE",
    DESIGN: "MEDIJI_I_KOMUNIKACIJE",
    WEB_FIGMA: "MEDIJI_I_KOMUNIKACIJE",
    SOCIAL_MEDIA_DESIGN: "MEDIJI_I_KOMUNIKACIJE",
    MATERIAL_STYLE: "MEDIJI_I_KOMUNIKACIJE",
    STICKERS: "MEDIJI_I_KOMUNIKACIJE",
    GUIDE_ILLUSTRATIONS: "MEDIJI_I_KOMUNIKACIJE",
    BOOK_MURALS: "MEDIJI_I_KOMUNIKACIJE",
    VIDEO_EDITING: "MEDIJI_I_KOMUNIKACIJE",
    PHOTO: "MEDIJI_I_KOMUNIKACIJE",
    GUIDEBOOK: "MEDIJI_I_KOMUNIKACIJE",
    TRAINING: "MEDIJI_I_KOMUNIKACIJE",
    COURSE_UPLOAD: "MEDIJI_I_KOMUNIKACIJE",
    PSYCHOLOGISTS: "MEDIJI_I_KOMUNIKACIJE",
    BOOK: "KULTURNA_DOBRA",
    MONITORING: "JAVNE_POVRSINE",
    CLEAN_CITY: "ZIVOTNA_SREDINA",
}

const ACTIVITY_CHECKBOX_MAP: Record<string, { x: number; fromTop: number }> = {
    MEDIJI_I_KOMUNIKACIJE: { x: 87, fromTop: 312 },
    JAVNE_POVRSINE: { x: 234, fromTop: 312 },
    ZIVOTNA_SREDINA: { x: 343, fromTop: 312 },
    KULTURNA_DOBRA: { x: 85, fromTop: 327 },
    SOCIJALNA_ZASTITA: { x: 441, fromTop: 327 },
}

const DRUGO_CHECKBOX = { x: 87, fromTop: 356 }
const DRUGO_TEXT_X = 140

export default async function generateCombinedPdf(application: ApplicationDto, program?: ProgramDto) {
    const fullName = must(application.name, "Name")
    const birthDate = fmt(application.birthDate, "Birth date")
    const passport = must(application.passport, "Passport")
    const age = dayjs().diff(dayjs(application.birthDate), "year").toString()
    const phone = must(application.phone, "Phone").replace(/^\+381\s*/, "")
    const email = must(application.email, "Email")
    const telegram = must(application.telegram, "Telegram")
    const address = getFullAddress(
        must(application.postalCode, "Postal code"),
        must(application.city, "City"),
        must(application.address, "Address")
    )
    const city = must(application.city, "City")
    const gender = application.gender ?? null

    const [templateBytes, prijavaBytes] = await Promise.all([
        fetch("/resources/template.pdf").then((r) => r.arrayBuffer()),
        fetch("/resources/prijava.pdf").then((r) => r.arrayBuffer()),
    ])

    const questionnairePdf = await PDFDocument.load(templateBytes)
    await fillQuestionnairePage(questionnairePdf, application)

    // ── Page 2: prijava
    const prijavaDoc = await PDFDocument.load(prijavaBytes)
    prijavaDoc.registerFontkit(fontkit)

    const mediumFont = await prijavaDoc.embedFont(
        Uint8Array.from(atob(MONTSERRAT_MEDIUM_NORMAL), (c) => c.charCodeAt(0)),
        { subset: true }
    )
    const symbolFont = await prijavaDoc.embedFont(
        Uint8Array.from(atob(DEJAVU_SANS), (c) => c.charCodeAt(0)),
        { subset: true }
    )

    const prijavaPage = prijavaDoc.getPages()[0]
    const { height } = prijavaPage.getSize()

    const fromTopP = (yPx: number, size = 8) => height - yPx - size

    const drawPxP = (text: string, xPx: number, yPx: number, font = mediumFont, size = 8) =>
        prijavaPage.drawText(text, {
            x: xPx,
            y: fromTopP(yPx, size),
            font,
            size,
            color: rgb(0, 0, 0),
        })

    const drawMarkP = (x: number, yFromTop: number) => drawPxP("✔", x, yFromTop, symbolFont, 9)

    // 1. Ime i prezime
    drawPxP(fullName, 195, 125)

    // 2. Пасош
    drawPxP(passport, 142, 142)

    // 3. Рођен (DD.MM.YYYY)
    drawPxP(birthDate, 138, 158)

    // 4. Старости
    drawPxP(age, 155, 174)

    // 5. Волонтирање је обављено у (град/општина)
    drawPxP(city, 270, 190)

    // 6. Адреса седишта
    drawPxP(address, 205, 222)

    // 7. Телефон (stripped +381)
    drawPxP(phone, 181, 253)

    // 8. E-mail
    drawPxP(email, 149, 269)

    drawPxP(telegram, 86, 284)

    // 9. Волонтерске активности — проект обязателен для определения группы.
    if (!application.project) {
        notifications.show(
            ErrorNotification("Project is empty", "Для формирования пријавы необходимо указать проект волонтёра.")
        )
        throw new Error("Project is empty")
    }
    const statGroup = PROJECT_TO_STAT_GROUP[application.project]
    if (statGroup) {
        const entry = ACTIVITY_CHECKBOX_MAP[statGroup]
        if (entry) {
            drawMarkP(entry.x, entry.fromTop)
        } else {
            drawMarkP(DRUGO_CHECKBOX.x, DRUGO_CHECKBOX.fromTop)
            const label = program?.nameSr || program?.nameEn || program?.nameRu || statGroup
            drawPxP(label, DRUGO_TEXT_X, DRUGO_CHECKBOX.fromTop)
        }
    } else {
        drawMarkP(DRUGO_CHECKBOX.x, DRUGO_CHECKBOX.fromTop)
        const label = program?.nameSr || program?.nameEn || program?.nameRu || application.project
        drawPxP(label, DRUGO_TEXT_X, DRUGO_CHECKBOX.fromTop)
    }

    // 10. Пол/Род
    if (gender === GenderEnumDto.Male) {
        drawMarkP(230, 383)
    } else if (gender === GenderEnumDto.Female) {
        drawMarkP(297, 383)
    } else if (gender != null) {
        // Other / Друго — the form has a third checkbox that template.pdf lacks
        drawMarkP(295, 386)
    }

    // Date

    const day = dayjs().format("DD")
    const month = dayjs().format("MM")
    const year = dayjs().format("YY")

    drawPxP(day + "." + month, 180, 643, mediumFont, 11)
    drawPxP(year, 234, 643, mediumFont, 11)

    // Signature

    const combinedPdf = await PDFDocument.create()
    const [questionnairePage] = await combinedPdf.copyPages(questionnairePdf, [0])
    const [prijavaFilledPage] = await combinedPdf.copyPages(prijavaDoc, [0])
    combinedPdf.addPage(questionnairePage)
    combinedPdf.addPage(prijavaFilledPage)

    const pdfBytes = await combinedPdf.save()
    saveAs(
        new Blob([pdfBytes as BlobPart], { type: "application/pdf" }),
        `Prijava_i_Upitnik_${fullName.replace(/\s+/g, "_")}.pdf`
    )
}

function must(value: string | null | undefined, name: string): string {
    if (!value) {
        notifications.show(
            ErrorNotification(`${name} is empty`, "Please fill in all required fields before generating the PDF.")
        )
        throw new Error(`${name} is empty`)
    }
    return value
}

function fmt(value: string | null | undefined, name: string) {
    return dayjs(must(value, name)).format("DD.MM.YYYY")
}
