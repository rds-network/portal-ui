export type ZahvalnicaBackground = "white" | "navy" | "soft"

export type ZahvalnicaTitleFont = "marck" | "magnolia" | "montserrat"

export type TextStyle = {
    size: number
    color: string
    bold: boolean
}

export type ZahvalnicaTypography = {
    org: TextStyle
    title: TextStyle
    name: TextStyle
    body: TextStyle
    sign: TextStyle
    meta: TextStyle
}

export type ZahvalnicaDraft = {
    orgTitle: string
    title: string
    volunteerName: string
    volunteerUsername: string | null
    intro: string
    contribution: string
    closing: string
    presidentLabel: string
    presidentName: string
    place: string
    dateLabel: string
    number: string
    background: ZahvalnicaBackground
    logoSrc: string
    backgroundImageSrc: string | null
    backgroundOpacity: number
    /** Percent of page width used by watermark (40–140). */
    watermarkScale: number
    /** Line-height multiplier for body paragraphs. */
    bodyLineHeight: number
    titleFont: ZahvalnicaTitleFont
    showStamp: boolean
    showSignature: boolean
    showQr: boolean
    stampSrc: string
    signatureSrc: string
    typography: ZahvalnicaTypography
}

export type ZahvalnicaIssue = {
    id: string
    verifyToken: string
    volunteerName: string
    volunteerUsername: string | null
    number: string
    dateLabel: string
    place: string
    contribution: string
    presidentName: string
    issuedAt: string
    issuedBy: string
    channel: "pdf" | "print"
}

export const ZAHVALNICA_STORAGE_KEY = "portal.zahvalnica.draft"
export const ZAHVALNICA_NUMBER_KEY = "portal.zahvalnica.lastNumber"
export const ZAHVALNICA_HISTORY_KEY = "portal.zahvalnica.history"
export const DEFAULT_LOGO = "/resources/zahvalnica-logo.png"
export const DEFAULT_BACKGROUND = "/resources/zahvalnica-bg.jpg"
export const DEFAULT_STAMP = "/resources/zahvalnica-stamp.png"
export const DEFAULT_SIGNATURE = "/resources/zahvalnica-signature.png"
export const MARCK_FONT_URL = "/resources/fonts/MarckScript-Regular.ttf"
export const MAGNOLIA_FONT_URL = "/resources/fonts/MagnoliaScript.otf"

export const TITLE_FONT_CSS: Record<ZahvalnicaTitleFont, string> = {
    marck: '"Marck Script", cursive',
    magnolia: '"Magnolia Script", cursive',
    montserrat: '"Montserrat", sans-serif',
}

export const defaultTypography = (): ZahvalnicaTypography => ({
    org: { size: 11, color: "#1a365d", bold: true },
    title: { size: 34, color: "#14233c", bold: false },
    name: { size: 18, color: "#1a365d", bold: true },
    body: { size: 11, color: "#14233c", bold: false },
    sign: { size: 12, color: "#1a365d", bold: true },
    meta: { size: 9, color: "#14233c", bold: false },
})

export const defaultZahvalnicaDraft = (overrides?: Partial<ZahvalnicaDraft>): ZahvalnicaDraft => {
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, "0")
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const yyyy = today.getFullYear()
    let nextNumber = 1
    try {
        nextNumber = Number(localStorage.getItem(ZAHVALNICA_NUMBER_KEY) || "0") + 1
    } catch {
        /* ignore */
    }
    return {
        orgTitle: "РУСКА ДИЈАСПОРА У СРБИЈИ",
        title: "ЗАХВАЛНИЦА",
        volunteerName: "",
        volunteerUsername: null,
        intro:
            "За допринос раду и развоју удружења „Руска дијаспора у Србији“, посвећеност волонтерском раду и подршку заједници.",
        contribution: "",
        closing:
            "Хвала Вам на времену, знању и труду које улажете у наше заједничке циљеве. Ваше учешће помаже да идеје претворимо у дела и пружимо подршку онима којима је потребна.",
        presidentLabel: "Председник удружења",
        presidentName: "",
        place: "У Новом Саду",
        dateLabel: `${dd}.${mm}.${yyyy}.`,
        number: String(nextNumber),
        background: "white",
        logoSrc: DEFAULT_LOGO,
        backgroundImageSrc: DEFAULT_BACKGROUND,
        backgroundOpacity: 100,
        watermarkScale: 100,
        bodyLineHeight: 1.55,
        titleFont: "marck",
        showStamp: true,
        showSignature: true,
        showQr: true,
        stampSrc: DEFAULT_STAMP,
        signatureSrc: DEFAULT_SIGNATURE,
        typography: defaultTypography(),
        ...overrides,
    }
}

export const TEXT_TEMPLATES: { id: string; labelId: string; patch: Partial<ZahvalnicaDraft> }[] = [
    {
        id: "default",
        labelId: "pages.zahvalnica.templates.default",
        patch: {
            intro:
                "За допринос раду и развоју удружења „Руска дијаспора у Србији“, посвећеност волонтерском раду и подршку заједници.",
            closing:
                "Хвала Вам на времену, знању и труду које улажете у наше заједничке циљеве. Ваше учешће помаже да идеје претворимо у дела и пружимо подршку онима којима је потребна.",
        },
    },
    {
        id: "event",
        labelId: "pages.zahvalnica.templates.event",
        patch: {
            intro:
                "За активно учешће у активностима удружења „Руска дијаспора у Србији“ и вредан допринос заједници.",
            closing:
                "Захваљујемо на енергији, одговорности и спремности да помогнете. Ваш труд чини нашу заједницу јачом.",
        },
    },
    {
        id: "long",
        labelId: "pages.zahvalnica.templates.long",
        patch: {
            intro:
                "За дугогодишњи допринос раду удружења „Руска дијаспора у Србији“, посвећеност волонтерским програмима и подршку људима око нас.",
            closing:
                "Хвала Вам што делите знање, време и срце. Заједно градимо простор поверења и солидарности.",
        },
    },
]

const migrateTypography = (raw?: Partial<ZahvalnicaTypography>): ZahvalnicaTypography => {
    const base = defaultTypography()
    if (!raw) return base
    return {
        org: { ...base.org, ...raw.org },
        title: { ...base.title, ...raw.title },
        name: { ...base.name, ...raw.name },
        body: { ...base.body, ...raw.body },
        sign: { ...base.sign, ...raw.sign },
        meta: { ...base.meta, ...raw.meta },
    }
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const migrateDraft = (raw: Partial<ZahvalnicaDraft>): ZahvalnicaDraft => {
    const base = defaultZahvalnicaDraft()
    const merged = { ...base, ...raw, typography: migrateTypography(raw.typography) }
    if ((raw as { background?: string }).background === "parchment") {
        merged.background = "white"
    }
    if (!raw.logoSrc || String(raw.logoSrc).includes("zahvalnica-logo.jpg")) {
        merged.logoSrc = DEFAULT_LOGO
    }
    if (raw.backgroundOpacity == null || Number.isNaN(Number(raw.backgroundOpacity))) {
        merged.backgroundOpacity = 100
    } else {
        merged.backgroundOpacity = clamp(Number(raw.backgroundOpacity), 0, 100)
    }
    // Migrate older drafts that used the RDS logo as the page background
    if (
        raw.backgroundImageSrc === undefined ||
        raw.backgroundImageSrc === null ||
        raw.backgroundImageSrc === DEFAULT_LOGO ||
        String(raw.backgroundImageSrc).includes("zahvalnica-logo")
    ) {
        merged.backgroundImageSrc = DEFAULT_BACKGROUND
        if (raw.backgroundOpacity == null || Number(raw.backgroundOpacity) <= 30) {
            merged.backgroundOpacity = 100
        }
        if (raw.watermarkScale == null || Number(raw.watermarkScale) < 90) {
            merged.watermarkScale = 100
        }
    }
    if (raw.volunteerUsername === undefined) merged.volunteerUsername = null
    if (raw.watermarkScale == null || Number.isNaN(Number(raw.watermarkScale))) {
        merged.watermarkScale = 100
    } else {
        merged.watermarkScale = clamp(Number(raw.watermarkScale), 40, 140)
    }
    if (raw.bodyLineHeight == null || Number.isNaN(Number(raw.bodyLineHeight))) {
        merged.bodyLineHeight = 1.55
    } else {
        merged.bodyLineHeight = clamp(Number(raw.bodyLineHeight), 1.1, 2.4)
    }
    if (raw.titleFont !== "marck" && raw.titleFont !== "magnolia" && raw.titleFont !== "montserrat") {
        merged.titleFont = "marck"
    }
    if (raw.showStamp == null) merged.showStamp = true
    if (raw.showSignature == null) merged.showSignature = true
    if (raw.showQr == null) merged.showQr = true
    if (!raw.stampSrc) merged.stampSrc = DEFAULT_STAMP
    if (!raw.signatureSrc) merged.signatureSrc = DEFAULT_SIGNATURE
    return merged
}

export const loadZahvalnicaDraft = (): ZahvalnicaDraft => {
    try {
        const raw = localStorage.getItem(ZAHVALNICA_STORAGE_KEY)
        if (!raw) return defaultZahvalnicaDraft()
        return migrateDraft(JSON.parse(raw))
    } catch {
        return defaultZahvalnicaDraft()
    }
}

export const saveZahvalnicaDraft = (draft: ZahvalnicaDraft) => {
    try {
        localStorage.setItem(ZAHVALNICA_STORAGE_KEY, JSON.stringify(draft))
        const n = Number(draft.number)
        if (!Number.isNaN(n) && n > 0) {
            localStorage.setItem(ZAHVALNICA_NUMBER_KEY, String(n))
        }
    } catch {
        /* ignore quota */
    }
}

export const loadZahvalnicaHistory = (): ZahvalnicaIssue[] => {
    try {
        const raw = localStorage.getItem(ZAHVALNICA_HISTORY_KEY)
        if (!raw) return []
        const list = JSON.parse(raw) as ZahvalnicaIssue[]
        return Array.isArray(list) ? list : []
    } catch {
        return []
    }
}

export const recordZahvalnicaIssue = (
    draft: ZahvalnicaDraft,
    issuedBy: string,
    channel: "pdf" | "print",
    verifyToken: string,
    issueId: string
): ZahvalnicaIssue[] => {
    const issue: ZahvalnicaIssue = {
        id: issueId,
        verifyToken,
        volunteerName: draft.volunteerName.trim(),
        volunteerUsername: draft.volunteerUsername,
        number: draft.number,
        dateLabel: draft.dateLabel,
        place: draft.place,
        contribution: draft.contribution.trim(),
        presidentName: draft.presidentName.trim(),
        issuedAt: new Date().toISOString(),
        issuedBy,
        channel,
    }
    const next = [issue, ...loadZahvalnicaHistory()].slice(0, 500)
    try {
        localStorage.setItem(ZAHVALNICA_HISTORY_KEY, JSON.stringify(next))
        const n = Number(draft.number)
        if (!Number.isNaN(n) && n > 0) {
            localStorage.setItem(ZAHVALNICA_NUMBER_KEY, String(n))
        }
    } catch {
        /* ignore */
    }
    return next
}

export const clearZahvalnicaHistory = () => {
    try {
        localStorage.removeItem(ZAHVALNICA_HISTORY_KEY)
    } catch {
        /* ignore */
    }
}

export const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace("#", "").trim()
    if (h.length === 3) {
        return [
            parseInt(h[0] + h[0], 16),
            parseInt(h[1] + h[1], 16),
            parseInt(h[2] + h[2], 16),
        ]
    }
    if (h.length >= 6) {
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
    }
    return [20, 35, 60]
}

export const BACKGROUND_COLORS: Record<
    ZahvalnicaBackground,
    { page: [number, number, number] }
> = {
    white: { page: [255, 255, 255] },
    navy: { page: [18, 36, 68] },
    soft: { page: [232, 240, 248] },
}
