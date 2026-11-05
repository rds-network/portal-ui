import {
    DEFAULT_SIGNATURE,
    DEFAULT_STAMP,
    SIGNATURE_BASE_WIDTH_MM,
    STAMP_BASE_SIZE_MM,
} from "src/shared/docs/zahvalnicaDraft"

export type PotvrdaSignDraft = {
    showSignature: boolean
    showStamp: boolean
    signatureSrc: string
    stampSrc: string
    signatureScale: number
    stampScale: number
    signatureOffsetX: number
    signatureOffsetY: number
    stampOffsetX: number
    stampOffsetY: number
}

export const defaultPotvrdaSignDraft = (): PotvrdaSignDraft => ({
    showSignature: true,
    showStamp: true,
    signatureSrc: DEFAULT_SIGNATURE,
    stampSrc: DEFAULT_STAMP,
    signatureScale: 35,
    stampScale: 85,
    signatureOffsetX: 0,
    signatureOffsetY: 0,
    stampOffsetX: 18,
    stampOffsetY: -8,
})

const STORAGE_KEY = "potvrda-sign-settings-v2"

export const loadPotvrdaSignDraft = (): PotvrdaSignDraft => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return defaultPotvrdaSignDraft()
        return { ...defaultPotvrdaSignDraft(), ...JSON.parse(raw) }
    } catch {
        return defaultPotvrdaSignDraft()
    }
}

export const savePotvrdaSignDraft = (draft: PotvrdaSignDraft) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
        /* ignore quota */
    }
}

export const signatureWidthMm = (draft: PotvrdaSignDraft) =>
    SIGNATURE_BASE_WIDTH_MM * (Math.min(120, Math.max(10, draft.signatureScale)) / 100)

export const stampSizeMm = (draft: PotvrdaSignDraft) =>
    STAMP_BASE_SIZE_MM * (Math.min(140, Math.max(20, draft.stampScale)) / 100)

/** Word footer cell — preview uses the same cap so stamp size matches the downloaded DOCX. */
export const POTVRDA_DOCX_MAX_STAMP_MM = 34
export const POTVRDA_DOCX_MAX_SIGNATURE_WIDTH_MM = 38

export const docxStampSizeMm = (draft: PotvrdaSignDraft) =>
    Math.min(stampSizeMm(draft), POTVRDA_DOCX_MAX_STAMP_MM)

export const docxSignatureWidthMm = (draft: PotvrdaSignDraft) =>
    Math.min(signatureWidthMm(draft), POTVRDA_DOCX_MAX_SIGNATURE_WIDTH_MM)

/** Anchor offsets in the signature table cell (same as potvrdaOfficialDocx build). */
export const potvrdaDocxStampAnchorMm = (draft: PotvrdaSignDraft) => ({
    x: 8 + draft.stampOffsetX,
    y: draft.stampOffsetY,
})

export const potvrdaDocxSignatureAnchorMm = (draft: PotvrdaSignDraft) => ({
    x: -2 + draft.signatureOffsetX,
    y: 6 + draft.signatureOffsetY,
})

/** Word half-points → CSS pt (w:sz val 24 → 12pt body). */
export const POTVRDA_DOCX_PT = {
    body: 12,
    hint: 9,
    president: 13,
    caption: 10,
} as const
