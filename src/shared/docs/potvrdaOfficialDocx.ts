import dayjs from "dayjs"
import PizZip from "pizzip"
import { saveAs } from "file-saver"
import templateUrl from "src/assets/doc_templates/potvrda_official_shell.docx?url"
import {
    addImageToDocx,
    inlineDrawing,
    loadImageDataUrl,
    measureDataUrl,
    mmToEmu,
} from "src/shared/docs/docxInlineImage"
import { potvrdaCategoriesFromProfile } from "src/shared/docs/potvrdaOfficialCategories"
import {
    defaultPotvrdaSignDraft,
    PotvrdaSignDraft,
    signatureWidthMm,
    stampSizeMm,
} from "src/shared/docs/potvrdaSignDraft"
import { DEFAULT_SIGNATURE, DEFAULT_STAMP } from "src/shared/docs/zahvalnicaDraft"

export type OfficialPotvrdaInput = {
    confirmNumber: string
    issueDate: string
    fullName: string
    jmbg: string
    birthDate: string
    gender: "MALE" | "FEMALE" | null
    citizenship: string
    addressCity: string
    periodFrom: string
    periodTo: string
    servicesDescription: string
    totalHours: number
    volunteerCity: string
    trainingType: string
    trainingProvider: string
    trainingFrom: string
    trainingTo: string
}

const escapeXml = (value: string): string =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")

const run = (text: string, bold = false, sizeHalfPoints = 24): string =>
    `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>${
        bold ? "<w:b/><w:bCs/>" : ""
    }<w:sz w:val="${sizeHalfPoints}"/><w:szCs w:val="${sizeHalfPoints}"/></w:rPr><w:t xml:space="preserve">${escapeXml(
        text
    )}</w:t></w:r>`

const paragraph = (parts: string, opts?: { center?: boolean; justify?: boolean; spacingLine?: number }): string => {
    const jc = opts?.center
        ? "<w:jc w:val=\"center\"/>"
        : opts?.justify
          ? "<w:jc w:val=\"both\"/>"
          : ""
    const spacing = opts?.spacingLine
        ? `<w:spacing w:line="${opts.spacingLine}" w:lineRule="auto"/>`
        : ""
    return `<w:p><w:pPr><w:pStyle w:val="NoSpacing"/>${jc}${spacing}</w:pPr>${parts}</w:p>`
}

export const genderWords = (gender: OfficialPotvrdaInput["gender"]) => ({
    born: gender === "FEMALE" ? "рођена" : gender === "MALE" ? "рођен" : "рођен/a",
    citizen: gender === "FEMALE" ? "држављанка" : gender === "MALE" ? "држављанин" : "држављанин/ка",
    performed:
        gender === "FEMALE" ? "обавила" : gender === "MALE" ? "обавио" : "обавио/ла",
})

export function buildOfficialPotvrdaDocumentXml(
    input: OfficialPotvrdaInput,
    signatureCellInner: string = run("________________________")
): string {
    const g = genderWords(input.gender)
    const hoursLabel = Number.isInteger(input.totalHours)
        ? String(input.totalHours)
        : input.totalHours.toFixed(1).replace(/\.0$/, "")

    const body = [
        paragraph(
            run("Удружење грађана ") +
                run("«РУСКА ДИЈАСПОРА У СРБИJИ»", true) +
                run(","),
            { center: true }
        ),
        paragraph(run("(назив и седиште организатора волонтирања)"), { center: true }),
        paragraph(run(`Број потврде ${input.confirmNumber}`)),
        paragraph(run(input.issueDate), { center: true }),
        paragraph(run("(дан, месец и година издавања)"), { center: true }),
        paragraph(""),
        paragraph(
            run(
                "На основу члана 25. став 1. тачка 2) Закона о волонтирању („Службени гласник РС”, број 36/10), издајем"
            ),
            { center: true }
        ),
        paragraph(""),
        paragraph(run("ПОТВРДУ О ВОЛОНТИРАЊУ", true), { center: true }),
        paragraph(""),
        paragraph(
            run(`Потврђујем да је ${input.fullName}, `) +
                run(`${input.jmbg ? input.jmbg + " " : ""}(ЈМБГ)/${g.born} `) +
                run(`дана ${input.birthDate}. `) +
                run(`- ${g.citizen} ${input.citizenship}, `) +
                run(`са пребивалиштем / боравиштем у ${input.addressCity}, `) +
                run(`у периоду од ${input.periodFrom} до ${input.periodTo} године ${g.performed} `) +
                run("следеће волонтерске услуге: ") +
                run(`${input.servicesDescription}.`),
            { justify: true, spacingLine: 360 }
        ),
        paragraph(
            run(
                `(кратак опис волонтерских услуга и крајњи корисник волонтирања - културно добро, јавна површина, природно добро, жене, деца, Роми, избеглице, расељена лица, особе са инвалидитетом, стара лица и др.).`,
                false,
                18
            ),
            { center: true }
        ),
        paragraph(""),
        paragraph(
            run(
                `Укупно трајање волонтирања у часовима износи ${hoursLabel} часова. Волонтирање је обављено у ${input.volunteerCity} (град/општина). `
            ),
            { justify: true, spacingLine: 360 }
        ),
        paragraph(
            run(
                `За време волонтирања извршено је оспособљавање волонтера ${input.trainingType} (врста оспособљавања), од стране ${input.trainingProvider} (извођач оспособљавања), у периоду од ${input.trainingFrom} до ${input.trainingTo}. `
            ),
            { justify: true, spacingLine: 360 }
        ),
        paragraph(""),
        `<w:tbl><w:tblPr><w:tblW w:w="10075" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="3775"/><w:gridCol w:w="1895"/><w:gridCol w:w="4405"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="3775" w:type="dxa"/><w:vMerge w:val="restart"/></w:tcPr>${paragraph(
            run("Председник Руске дијаспоре у Србији", false, 26)
        )}</w:tc><w:tc><w:tcPr><w:tcW w:w="1895" w:type="dxa"/><w:vMerge w:val="restart"/></w:tcPr>${paragraph(
            run("M. П.")
        )}</w:tc><w:tc>${paragraph(signatureCellInner, { center: true })}</w:tc></w:tr><w:tr><w:tc><w:tcPr><w:vMerge/></w:tcPr>${paragraph(
            ""
        )}</w:tc><w:tc><w:tcPr><w:vMerge/></w:tcPr>${paragraph("")}</w:tc><w:tc>${paragraph(
            run("(потпис овлашћеног лица)", false, 20),
            { center: true }
        )}</w:tc></w:tr></w:tbl>`,
    ].join("")

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body}<w:sectPr w:rsidR="003C62C6" w:rsidRPr="00D04DB4" w:rsidSect="00B11333"><w:headerReference w:type="default" r:id="rId9"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1464" w:right="850" w:bottom="568" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr></w:body></w:document>`
}

let templateBufferPromise: Promise<ArrayBuffer> | null = null

const loadTemplateBuffer = (): Promise<ArrayBuffer> => {
    if (!templateBufferPromise) {
        templateBufferPromise = fetch(templateUrl).then((r) => {
            if (!r.ok) throw new Error("Template not found")
            return r.arrayBuffer()
        })
    }
    return templateBufferPromise
}

const potvrdaFileName = (fullName: string) => {
    const safeName = fullName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_")
    return `Potvrda_o_volontiranju_${safeName}.docx`
}

const buildSignatureCellInner = async (zip: PizZip, sign: PotvrdaSignDraft): Promise<string> => {
    const parts: string[] = []
    let docPrId = 100
    const stamp = Date.now()

    if (sign.showSignature) {
        const dataUrl = await loadImageDataUrl(sign.signatureSrc || DEFAULT_SIGNATURE)
        const rel = addImageToDocx(zip, `potvrda_sig_${stamp}.png`, dataUrl)
        const { width, height } = await measureDataUrl(dataUrl)
        const wMm = signatureWidthMm(sign)
        const hMm = Math.max(8, wMm * (height / Math.max(width, 1)))
        parts.push(inlineDrawing(rel, mmToEmu(wMm), mmToEmu(hMm), docPrId++))
    }

    if (sign.showStamp) {
        const dataUrl = await loadImageDataUrl(sign.stampSrc || DEFAULT_STAMP)
        const rel = addImageToDocx(zip, `potvrda_stamp_${stamp}.png`, dataUrl)
        const sizeMm = stampSizeMm(sign)
        parts.push(inlineDrawing(rel, mmToEmu(sizeMm), mmToEmu(sizeMm), docPrId++))
    }

    return parts.length > 0 ? parts.join("") : run("________________________")
}

export async function buildOfficialPotvrdaBlob(
    input: OfficialPotvrdaInput,
    sign: PotvrdaSignDraft | null,
    options?: { download?: boolean }
): Promise<{ blob: Blob; fileName: string }> {
    const buffer = await loadTemplateBuffer()
    const zip = new PizZip(buffer)
    const signDraft = sign ?? defaultPotvrdaSignDraft()
    const signatureInner =
        signDraft.showSignature || signDraft.showStamp
            ? await buildSignatureCellInner(zip, signDraft)
            : run("________________________")
    zip.file("word/document.xml", buildOfficialPotvrdaDocumentXml(input, signatureInner))
    const blob = zip.generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }) as Blob
    const fileName = potvrdaFileName(input.fullName)
    if (options?.download !== false) {
        saveAs(blob, fileName)
    }
    return { blob, fileName }
}

export async function generateOfficialPotvrdaDocx(
    input: OfficialPotvrdaInput,
    sign?: PotvrdaSignDraft | null
): Promise<{ blob: Blob; fileName: string }> {
    return buildOfficialPotvrdaBlob(input, sign ?? null, { download: true })
}

const formatDate = (value: string) => dayjs(value).format("DD.MM.YYYY")

/** Бессрочный договор часто хранится далёкой датой — для потврde не тянем её в период. */
const effectiveContractEnd = (endRaw: string | undefined, issue: dayjs.Dayjs, start: dayjs.Dayjs): string => {
    if (!endRaw) {
        return issue.format("DD.MM.YYYY")
    }
    const end = dayjs(endRaw)
    if (!end.isValid() || end.year() >= issue.year() + 10 || end.isBefore(start)) {
        return issue.format("DD.MM.YYYY")
    }
    return end.format("DD.MM.YYYY")
}

export function defaultOfficialPotvrdaFields(
    user: {
        fullName?: string
        birthDate?: string | null
        gender?: "MALE" | "FEMALE" | null
        city?: string | null
        program?: { code?: string; nameSr?: string | null } | null
        project?: { code?: string; nameSr?: string | null } | null
        contracts?: Array<{ startDate?: string; endDate?: string }>
        residencePermits?: Array<{ identityNumber?: string; nationality?: string }>
    },
    options?: {
        totalHours?: number
        periodFrom?: string
        periodTo?: string
    }
): Partial<OfficialPotvrdaInput> {
    const contracts = user.contracts ?? []
    const starts = contracts.map((c) => c.startDate).filter(Boolean).sort()
    const ends = contracts.map((c) => c.endDate).filter(Boolean).sort()
    const issue = dayjs()
    const startRaw = starts[0]
    const start = startRaw ? dayjs(startRaw) : issue.startOf("year")
    const periodFrom = options?.periodFrom ?? (startRaw ? formatDate(startRaw) : issue.startOf("year").format("DD.MM.YYYY"))
    const periodTo =
        options?.periodTo ?? effectiveContractEnd(ends.at(-1), issue, start)
    const permit = user.residencePermits?.[0]
    const city = user.city?.trim() || ""
    const addressCity = city ? `граду ${city}` : ""
    const { servicesDescription } = potvrdaCategoriesFromProfile(user)

    const onboardingYear = start.isValid() ? start.year() : issue.year()
    const trainingDay = start.isValid() ? start.format("DD.MM.YYYY") : `01.01.${onboardingYear}`

    return {
        confirmNumber: "",
        issueDate: issue.format("DD.MM.YYYY"),
        fullName: user.fullName ?? "",
        jmbg: permit?.identityNumber ?? "",
        birthDate: user.birthDate ? dayjs(user.birthDate).format("DD.MM.YYYY") : "",
        gender: user.gender ?? null,
        citizenship: "Русије (друга држава)",
        addressCity,
        periodFrom,
        periodTo,
        servicesDescription,
        totalHours: options?.totalHours ?? 0,
        volunteerCity: city ? `граду ${city}` : "",
        trainingType: "иницијално оспособљавање",
        trainingProvider: "РУСКА ДИЈАСПОРА У СРБИJИ",
        trainingFrom: trainingDay,
        trainingTo: trainingDay,
    }
}
