import { ApplicationDto } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"
import { jsPDF as JsPdf } from "jspdf"
import { MONTSERRAT_BOLD_BOLD } from "src/shared/docs/fonts/Montserrat-Bold-bold"
import { MONTSERRAT_MEDIUM_NORMAL } from "src/shared/docs/fonts/Montserrat-Medium-normal"
import { qrcodegen } from "src/shared/docs/qrcodegen"

const ACCOUNT = "200362486010103838"
const ACCOUNT_DISPLAY = "200-3624860101038-38"
const RECIPIENT_QR = "UDRUZENJE GRADJANA RUSKA DIJASPORA U SRBIJI"
const RECIPIENT_SLIP = "Удружене грађана «РУСКА ДИЈАСПОРА У СРБИЈИ»"
const CODE_SLIP = "189"
const CODE_QR = "289"
const MODEL = "00"
const BANK = "Banka Postanska stedionica"
const ACTIVITY = "9499"
const REGISTRY = "28355122"
const TAX_ID = "113526376"
const PURPOSE_SLIP = "чланарина"
const PURPOSE_QR = "CLANARINA"

const CYRILLIC: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ё: "e", ж: "z", з: "z", и: "i",
    й: "j", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r",
    с: "s", т: "t", ћ: "c", у: "u", ф: "f", х: "h", ц: "c", ч: "c", џ: "dz", ш: "s", щ: "s",
    ъ: "", ы: "y", ь: "", э: "e", ю: "ju", я: "ja",
}

export const MEMBERSHIP_FEE = 6000
export const MEMBERSHIP_FEE_TWO_YEARS = 12000

/** Год договора — 6 000, два года и больше — 12 000. */
export const suggestedMembershipFee = (application: ApplicationDto): number => {
    const start = application.contract?.startDate
    const end = application.contract?.endDate
    if (!start || !end) return MEMBERSHIP_FEE
    const months = dayjs(end).diff(dayjs(start), "month", true)
    return months >= 18 ? MEMBERSHIP_FEE_TWO_YEARS : MEMBERSHIP_FEE
}

const latinize = (value: string): string =>
    Array.from(value)
        .map((char) => {
            const mapped = CYRILLIC[char.toLowerCase()]
            if (mapped === undefined) return char
            return char === char.toLowerCase() ? mapped : mapped.toUpperCase()
        })
        .join("")

const ipsText = (value: string, max: number): string =>
    latinize(value)
        .replace(/\|/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
        .toUpperCase()

const formatAmount = (amount: number): string => {
    const [whole, fraction] = amount.toFixed(2).split(".")
    return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction}`
}

const buildIps = (payer: string, amount: number, year: string): string => {
    const parts = [
        "K:PR",
        "V:01",
        "C:1",
        `R:${ACCOUNT}`,
        `N:${RECIPIENT_QR}`,
        `I:RSD${amount.toFixed(2).replace(".", ",")}`,
        `P:${ipsText(payer, 70)}`,
        `SF:${CODE_QR}`,
        `S:${PURPOSE_QR}`,
        `RO:${MODEL}${year}`,
    ]
    return parts.join("|")
}

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

const drawField = (
    pdf: JsPdf,
    label: string,
    value: string,
    x: number,
    y: number,
    width: number
): number => {
    pdf.setFont("Montserrat-Medium", "normal")
    pdf.setFontSize(7)
    pdf.setTextColor(80)
    pdf.text(label, x, y)
    pdf.setFont("Montserrat-Bold", "bold")
    pdf.setFontSize(9)
    pdf.setTextColor(17)
    const lines = pdf.splitTextToSize(value, width) as string[]
    pdf.text(lines, x, y + 4)
    const bottom = y + 4 + lines.length * 3.6
    pdf.setDrawColor(180)
    pdf.line(x, bottom + 0.6, x + width, bottom + 0.6)
    return bottom + 4.2
}

const drawSlip = (
    pdf: JsPdf,
    top: number,
    payer: string,
    amount: number,
    year: string,
    ips: string
) => {
    const x = 12
    const width = 186
    const height = 124
    const split = x + width * 0.56
    const bodyBottom = top + 96

    pdf.setDrawColor(40)
    pdf.setLineWidth(0.35)
    pdf.rect(x, top, width, height)
    pdf.setFont("Montserrat-Bold", "bold")
    pdf.setFontSize(11)
    pdf.setTextColor(17)
    pdf.text("НАЛОГ ЗА УПЛАТУ", x + width / 2, top + 6, { align: "center" })
    pdf.line(x, top + 8.5, x + width, top + 8.5)
    pdf.line(split, top + 8.5, split, bodyBottom)

    let left = top + 13
    left = drawField(pdf, "уплатилац", payer, x + 3, left, split - x - 8)
    left = drawField(pdf, "сврха уплате", PURPOSE_SLIP, x + 3, left, split - x - 8)
    drawField(pdf, "прималац", RECIPIENT_SLIP, x + 3, left, split - x - 8)

    let right = top + 13
    const rightX = split + 3
    const rightW = x + width - rightX - 3
    right = drawField(pdf, "шифра плаћања", CODE_SLIP, rightX, right, rightW)
    right = drawField(pdf, "валута", "RSD", rightX, right, rightW)
    right = drawField(pdf, "износ", formatAmount(amount), rightX, right, rightW)
    right = drawField(pdf, "рачун примаоца", ACCOUNT_DISPLAY, rightX, right, rightW)
    drawField(pdf, "модел / позив на број", `${MODEL} / ${year}`, rightX, right, rightW)

    pdf.setDrawColor(40)
    pdf.line(x, bodyBottom, x + width, bodyBottom)
    pdf.setFont("Montserrat-Medium", "normal")
    pdf.setFontSize(7)
    pdf.setTextColor(50)
    const meta = pdf.splitTextToSize(
        `${BANK}\nШифра делатности ${ACTIVITY} · Матични број ${REGISTRY} · ПИБ ${TAX_ID}`,
        width - 40
    ) as string[]
    pdf.text(meta, x + 3, bodyBottom + 5)
    drawQr(pdf, ips, x + width - 30, bodyBottom + 2, 26)
    pdf.setFontSize(6.5)
    pdf.text(
        "печат и потпис уплатиоца      место и датум пријема      датум валуте",
        x + 3,
        top + height - 3
    )
}

export const generateUplatnicaPdf = (
    name: string,
    city: string,
    amount: number,
    options?: { download?: boolean }
): File => {
    const year = String(new Date().getFullYear())
    const payer = `${name.trim().toUpperCase()}, ${city.trim()}`
    const ips = buildIps(`${name.trim()} ${city.trim()}`, amount, year)
    const pdf = new JsPdf({ orientation: "p", unit: "mm", format: "a4" })
    pdf.addFileToVFS("Montserrat-Medium-normal.ttf", MONTSERRAT_MEDIUM_NORMAL)
    pdf.addFont("Montserrat-Medium-normal.ttf", "Montserrat-Medium", "normal")
    pdf.addFileToVFS("Montserrat-Bold-bold.ttf", MONTSERRAT_BOLD_BOLD)
    pdf.addFont("Montserrat-Bold-bold.ttf", "Montserrat-Bold", "bold")
    drawSlip(pdf, 12, payer, amount, year, ips)
    drawSlip(pdf, 144, payer, amount, year, ips)
    const fileName = `Uplatnica_${name.trim().replaceAll(" ", "_") || "clanarina"}.pdf`
    const file = new File([pdf.output("blob")], fileName, { type: "application/pdf" })
    if (options?.download !== false) pdf.save(fileName)
    return file
}
