import { notifications } from "@mantine/notifications"
import fontkit from "@pdf-lib/fontkit"
import { ApplicationDto, GenderEnumDto } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"
import { saveAs } from "file-saver"
import { PDFDocument, rgb } from "pdf-lib"
import { DEJAVU_SANS } from "src/shared/docs/fonts/DejaVuSans"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { getFullAddress } from "src/shared/utils/getFullAddress"

export default async function generateQuestionnairePdf(application: ApplicationDto) {
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
    const gender = must(application.gender, "Gender") ?? null
    const currentDate = dayjs().format("DD.MM.YYYY")
    const templateBytes = await fetch("/resources/template.pdf").then((r) => r.arrayBuffer())
    const pdf = await PDFDocument.load(templateBytes)

    const GENDER_MALE_BOX = { x: 134, y: 558 }
    const GENDER_FEMALE_BOX = { x: 186, y: 558 }

    pdf.registerFontkit(fontkit)

    const mediumFont = await pdf.embedFont(
        Uint8Array.from(atob(MONTSERRAT_MEDIUM_NORMAL), (c) => c.charCodeAt(0)),
        { subset: true }
    )

    const symbolFont = await pdf.embedFont(
        Uint8Array.from(atob(DEJAVU_SANS), (c) => c.charCodeAt(0)),
        { subset: true }
    )

    const page = pdf.getPages()[0]
    const { height } = page.getSize()

    const px = (v: number) => v
    const fromTop = (yPx: number, fontSize = 10) => height - px(yPx) - fontSize

    const drawPx = (text: string, xPx: number, yPx: number, font = mediumFont, size = 8) =>
        page.drawText(text, {
            x: px(xPx),
            y: fromTop(yPx, size),
            font,
            size,
            color: rgb(0, 0, 0),
        })

    const drawMark = (x: number, y: number) => drawPx("✔", x, y, symbolFont, 9)

    drawPx(fullName, 350, 285)
    drawPx(passport, 109, 318)
    drawPx(birthDate, 173, 339)
    drawPx(age, 155, 360)
    drawPx(city, 335, 380)
    drawPx(address, 62, 425)
    drawPx(phone, 268, 447)
    drawPx(email, 101, 468)
    drawPx(telegram, 420, 468)
    if (gender === GenderEnumDto.Male) {
        drawMark(GENDER_MALE_BOX.x, GENDER_MALE_BOX.y)
    } else if (gender === GenderEnumDto.Female) {
        drawMark(GENDER_FEMALE_BOX.x, GENDER_FEMALE_BOX.y)
    }
    drawPx(currentDate, 96, 735)

    const pdfBytes = await pdf.save()
    saveAs(
        new Blob([pdfBytes as BlobPart], { type: "application/pdf" }),
        `Upitnik_${fullName.replace(/\s+/g, "_")}.pdf`
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
