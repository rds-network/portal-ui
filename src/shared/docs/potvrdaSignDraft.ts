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
}

export const defaultPotvrdaSignDraft = (): PotvrdaSignDraft => ({
    showSignature: true,
    showStamp: true,
    signatureSrc: DEFAULT_SIGNATURE,
    stampSrc: DEFAULT_STAMP,
    signatureScale: 35,
    stampScale: 85,
})

const STORAGE_KEY = "potvrda-sign-settings-v1"

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
