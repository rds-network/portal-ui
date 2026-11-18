import dayjs from "dayjs"
import { saveAs } from "file-saver"
import PizZip from "pizzip"
import {
    addImageToDocx,
    inlineDrawing,
    loadImageDataUrl,
    measureDataUrl,
    mmToEmu,
} from "src/shared/docs/docxInlineImage"
import { loadTemplateBuffer, paragraph, run, wrapShellDocument } from "src/shared/docs/potvrdaOfficialDocx"
import {
    defaultPotvrdaSignDraft,
    docxSignatureWidthMm,
    docxStampSizeMm,
    PotvrdaSignDraft,
} from "src/shared/docs/potvrdaSignDraft"
import { DEFAULT_SIGNATURE, DEFAULT_STAMP } from "src/shared/docs/zahvalnicaDraft"

export type TerminationPotvrdaInput = {
    confirmNumber: string
    issueDate: string
    fullName: string
    birthDate: string
    citizenship: string
    passport: string
    contractNumber: string
    contractDate: string
    terminationDate: string
    basis: string
    mupNotified: boolean
}

export const DEFAULT_TERMINATION_BASIS = "споразумом уговорних страна, на захтев волонтера"

const ORG = "Удружење „Руска дијаспора у Србији“"
const BLANK = "________"

/** Serbian date style: "18.11.2026." — exactly one trailing dot. */
const srDate = (value: string) => {
    const trimmed = value.trim().replace(/\.+$/, "")
    return trimmed ? `${trimmed}.` : BLANK
}

const orBlank = (value: string) => value.trim() || BLANK

const field = (label: string, value: string) =>
    paragraph(run(`${label}: `) + run(orBlank(value), true), { spacingLine: 300 })

type SignImages = { stamp: string; signature: string }

const SIGNATURE_LINE = run("________________________")

/** Stamp and signature are inline in their own cells so Word and docx-preview place them identically. */
const signatureTable = (images: SignImages) =>
    `<w:tbl><w:tblPr><w:tblW w:w="10075" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4400"/><w:gridCol w:w="5675"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="4400" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>${
        images.stamp ? paragraph(images.stamp, { center: true }) : ""
    }${paragraph(run("М.П."), { center: true })}</w:tc><w:tc><w:tcPr><w:tcW w:w="5675" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>${paragraph(
        images.signature || SIGNATURE_LINE,
        { center: true }
    )}${paragraph(run("Леонид Стеценко"), { center: true })}${paragraph(run("Председник удружења"), {
        center: true,
    })}</w:tc></w:tr></w:tbl>`

export function buildTerminationPotvrdaDocumentXml(
    input: TerminationPotvrdaInput,
    images: SignImages = { stamp: "", signature: "" }
): string {
    const body = [
        paragraph(run(ORG, true), { center: true }),
        paragraph(""),
        paragraph(run(`Број: ${orBlank(input.confirmNumber)}   /   Датум: ${srDate(input.issueDate)}`)),
        paragraph(""),
        paragraph(run("ПОТВРДА", true, 28), { center: true }),
        paragraph(run("о престанку уговора о волонтирању", true), { center: true }),
        paragraph(""),
        paragraph(
            run(
                `${ORG}, као организатор волонтирања, потврђује да је уговор о волонтирању бр. ${orBlank(
                    input.contractNumber
                )} од ${srDate(input.contractDate)}, закључен са лицем:`
            ),
            { justify: true, spacingLine: 360 }
        ),
        paragraph(""),
        field("Име и презиме", input.fullName),
        field("Датум рођења", input.birthDate.trim() ? srDate(input.birthDate) : ""),
        field("Држављанство", input.citizenship),
        field("Број пасоша", input.passport),
        paragraph(""),
        paragraph(
            run(
                `престао да важи дана ${srDate(input.terminationDate)} године, ${
                    input.basis.trim() || DEFAULT_TERMINATION_BASIS
                }, у складу са чланом 19. Закона о волонтирању.`
            ),
            { justify: true, spacingLine: 360 }
        ),
        paragraph(
            run(
                "Од наведеног датума именовано лице није ангажовано као волонтер код Организатора. Организатор нема потраживања према волонтеру."
            ),
            { justify: true, spacingLine: 360 }
        ),
        input.mupNotified
            ? paragraph(
                  run(
                      "О престанку уговора Организатор је обавестио надлежни орган МУП-а у складу са чланом 8. став 1. Закона о странцима."
                  ),
                  { justify: true, spacingLine: 360 }
              )
            : "",
        paragraph(
            run(
                "Потврда се издаје на захтев лица ради промене основа привременог боравка у Републици Србији и у друге сврхе се не може користити."
            ),
            { justify: true, spacingLine: 360, keepNext: true }
        ),
        paragraph("", { keepNext: true }),
        signatureTable(images),
    ].join("")

    return wrapShellDocument(body)
}

const embedSignImages = async (zip: PizZip, sign: PotvrdaSignDraft): Promise<SignImages> => {
    const key = Date.now()
    const images: SignImages = { stamp: "", signature: "" }
    if (sign.showStamp) {
        const dataUrl = await loadImageDataUrl(sign.stampSrc || DEFAULT_STAMP)
        const rel = addImageToDocx(zip, `termination_stamp_${key}.png`, dataUrl)
        const size = mmToEmu(docxStampSizeMm(sign))
        images.stamp = inlineDrawing(rel, size, size, 201)
    }
    if (sign.showSignature) {
        const dataUrl = await loadImageDataUrl(sign.signatureSrc || DEFAULT_SIGNATURE)
        const rel = addImageToDocx(zip, `termination_sig_${key}.png`, dataUrl)
        const { width, height } = await measureDataUrl(dataUrl)
        const wMm = docxSignatureWidthMm(sign)
        const hMm = Math.min(16, Math.max(8, wMm * (height / Math.max(width, 1))))
        images.signature = inlineDrawing(rel, mmToEmu(wMm), mmToEmu(hMm), 202)
    }
    return images
}

const terminationFileName = (fullName: string) => {
    const safeName = fullName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_")
    return `Potvrda_o_prestanku_ugovora_${safeName || "volonter"}.docx`
}

export async function buildTerminationPotvrdaBlob(
    input: TerminationPotvrdaInput,
    sign: PotvrdaSignDraft | null,
    options?: { download?: boolean }
): Promise<{ blob: Blob; fileName: string }> {
    const zip = new PizZip(await loadTemplateBuffer())
    const images = await embedSignImages(zip, sign ?? defaultPotvrdaSignDraft())
    zip.file("word/document.xml", buildTerminationPotvrdaDocumentXml(input, images))
    const blob = zip.generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }) as Blob
    const fileName = terminationFileName(input.fullName)
    if (options?.download === true) {
        saveAs(blob, fileName)
    }
    return { blob, fileName }
}

const formatDate = (value?: string | null) => (value ? dayjs(value).format("DD.MM.YYYY") : "")

/** Open-ended contracts are stored with a far-future end date; those are not a termination date. */
const realisticEnd = (endRaw: string | undefined) => {
    if (!endRaw) return null
    const end = dayjs(endRaw)
    return end.isValid() && end.year() < dayjs().year() + 2 ? end : null
}

export function defaultTerminationPotvrdaFields(
    user: {
        fullName?: string
        birthDate?: string | null
        contracts?: Array<{ startDate?: string; endDate?: string }>
    },
    application?: {
        passport?: string | null
        birthDate?: string | null
        contractDocumentDate?: string | null
        contract?: { startDate?: string } | null
    } | null
): Omit<TerminationPotvrdaInput, "confirmNumber"> {
    const contracts = user.contracts ?? []
    const firstStart = contracts.map((c) => c.startDate).filter(Boolean).sort()[0]
    const lastEnd = realisticEnd(contracts.map((c) => c.endDate).filter(Boolean).sort().at(-1))
    const contractDate =
        application?.contractDocumentDate ?? application?.contract?.startDate ?? firstStart ?? null

    return {
        issueDate: dayjs().format("DD.MM.YYYY"),
        fullName: user.fullName ?? "",
        birthDate: formatDate(user.birthDate ?? application?.birthDate),
        citizenship: "Руска Федерација",
        passport: application?.passport ?? "",
        contractNumber: "",
        contractDate: formatDate(contractDate),
        terminationDate: (lastEnd ?? dayjs()).format("DD.MM.YYYY"),
        basis: DEFAULT_TERMINATION_BASIS,
        mupNotified: true,
    }
}
