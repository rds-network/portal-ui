import dayjs from "dayjs"
import { jsPDF as JsPdf } from "jspdf"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"

export type PotvrdaMembershipInput = {
    fullName: string
    passportOrId: string
    contractNumber: string
    contractSignedOn: string
    indefinite: boolean
    validUntil: string | null
    gender?: "MALE" | "FEMALE" | null
    download?: boolean
}

const engagementWord = (gender?: "MALE" | "FEMALE" | null): string => {
    if (gender === "MALE") return "angažovan"
    if (gender === "FEMALE") return "angažovana"
    return "angažovan/a"
}

const namedWord = (gender?: "MALE" | "FEMALE" | null): string => {
    if (gender === "MALE") return "imenovanog"
    if (gender === "FEMALE") return "imenovane"
    return "imenovanog/imenovane"
}

export function generatePotvrdaMembershipPdf(input: PotvrdaMembershipInput): File {
    const fullName = requireField("Ime", input.fullName)
    const passportOrId = requireField("Pasoš / lična karta", input.passportOrId)
    const contractNumber = requireField("Broj ugovora", input.contractNumber)
    const contractSignedOn = requireField("Datum ugovora", input.contractSignedOn)
    if (!input.indefinite && !input.validUntil) {
        throw new Error("Datum važenja ugovora je obavezan")
    }

    const durationClause = input.indefinite
        ? "zaključen je na neodređeno vreme"
        : `važi do ${input.validUntil} godine`

    const pdf = new JsPdf({
        orientation: "p",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        compress: true,
    })

    pdf.addFileToVFS("Montserrat-Medium-normal.ttf", MONTSERRAT_MEDIUM_NORMAL)
    pdf.addFont("Montserrat-Medium-normal.ttf", "Montserrat-Medium", "normal")
    pdf.addFileToVFS("Montserrat-Bold-bold.ttf", MONTSERRAT_BOLD_BOLD)
    pdf.addFont("Montserrat-Bold-bold.ttf", "Montserrat-Bold", "bold")

    const MARGIN_X = 20
    const MARGIN_TOP = 22
    const MARGIN_BOTTOM = 22
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const contentWidth = pageWidth - MARGIN_X * 2

    const TITLE_PT = 14
    const BODY_PT = 10.5
    const META_PT = 9

    let y = MARGIN_TOP
    const ptToMm = (pt: number) => pt * 0.352778
    const lineHeightMm = (pt: number, factor = 1.35) => ptToMm(pt) * factor

    const setBody = () => {
        pdf.setFont("Montserrat-Medium", "normal")
        pdf.setFontSize(BODY_PT)
    }

    const setBold = () => {
        pdf.setFont("Montserrat-Bold", "bold")
    }

    const ensureSpace = (needMm: number) => {
        if (y + needMm > pageHeight - MARGIN_BOTTOM) {
            pdf.addPage()
            y = MARGIN_TOP
        }
    }

    const writeCentered = (text: string, pt: number, gapAfter = 4) => {
        ensureSpace(lineHeightMm(pt) + gapAfter)
        setBold()
        pdf.setFontSize(pt)
        pdf.text(text, pageWidth / 2, y, { align: "center" })
        y += lineHeightMm(pt) + gapAfter
    }

    const writeParagraph = (text: string, pt: number, gapAfter = 5) => {
        setBody()
        pdf.setFontSize(pt)
        const lines = pdf.splitTextToSize(text, contentWidth) as string[]
        const lh = lineHeightMm(pt)
        for (const line of lines) {
            ensureSpace(lh)
            pdf.text(line, MARGIN_X, y)
            y += lh
        }
        y += gapAfter
    }

    writeCentered("POTVRDA", TITLE_PT, 6)
    writeSpacer(4)

    const p1 = `Ovim potvrđujemo da je ${fullName}, broj pasoša / lične karte ${passportOrId}, ${engagementWord(input.gender)} kao volonter u Udruženju „Ruska dijaspora u Srbiji“ na osnovu Ugovora o volontiranju br. ${contractNumber}, zaključenog dana ${contractSignedOn}.`
    writeParagraph(p1, BODY_PT)

    const p2 = `Navedeni ugovor je na dan izdavanja ove potvrde i dalje na snazi, nije raskinut niti je istekao, i ${durationClause}.`
    writeParagraph(p2, BODY_PT)

    const p3 = `Potvrda se izdaje na lični zahtev ${namedWord(input.gender)} radi predaje banci i u druge svrhe se ne može koristiti.`
    writeParagraph(p3, BODY_PT, 12)

    const issueDate = dayjs().format("DD.MM.YYYY.")
    writeParagraph(`U Beogradu, ${issueDate}`, META_PT, 10)

    setBody()
    pdf.setFontSize(META_PT)
    ensureSpace(lineHeightMm(META_PT) * 2)
    pdf.text("Predsednik udruženja", MARGIN_X, y)
    y += lineHeightMm(META_PT)
    pdf.text("LEONID STEČENKO: __________________", MARGIN_X, y)

    const safeName = fullName.replaceAll(/[^\w\s-]/g, "").replaceAll(" ", "_")
    const fileName = `Potvrda_${safeName}.pdf`
    const file = new File([pdf.output("blob")], fileName, { type: "application/pdf" })
    if (input.download !== false) {
        pdf.save(fileName)
    }
    return file

    function writeSpacer(mm: number) {
        ensureSpace(mm)
        y += mm
    }
}

function requireField(label: string, value: string | null | undefined): string {
    const trimmed = value?.trim()
    if (!trimmed) {
        throw new Error(`${label} nije popunjeno`)
    }
    return trimmed
}

export function defaultPotvrdaFieldsFromProfile(
    user: { fullName?: string | null; gender?: "MALE" | "FEMALE" | null; contracts?: Array<{ startDate?: string; endDate?: string; type?: string }> },
    application?: {
        name?: string | null
        passport?: string | null
        contract?: { startDate?: string; endDate?: string } | null
        contractDocumentDate?: string | null
    } | null
): Partial<PotvrdaMembershipInput> {
    const signedRaw =
        application?.contractDocumentDate ??
        application?.contract?.startDate ??
        user.contracts?.map((c) => c.startDate).filter(Boolean).sort().at(-1) ??
        null
    const endFromApp = application?.contract?.endDate
    const ends = (user.contracts ?? [])
        .filter((c) => !c.type || c.type === "REGULAR")
        .map((c) => c.endDate)
        .filter((v): v is string => !!v)
        .sort()
    const endRaw = endFromApp ?? ends.at(-1) ?? null

    return {
        fullName: user.fullName ?? application?.name ?? "",
        passportOrId: application?.passport ?? "",
        contractNumber: "",
        contractSignedOn: signedRaw ? dayjs(signedRaw).format("DD.MM.YYYY.") : "",
        indefinite: false,
        validUntil: endRaw ? dayjs(endRaw).format("DD.MM.YYYY.") : "",
        gender: user.gender ?? null,
    }
}
