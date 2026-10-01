export type ZahvalnicaBackground = "white" | "navy" | "soft"

export type ZahvalnicaTitleFont = "marck" | "magnolia" | "montserrat" | "custom"

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
    /** Uploaded TTF/OTF as data-URL when titleFont === "custom". */
    customTitleFontData: string | null
    customTitleFontName: string
    showStamp: boolean
    showSignature: boolean
    showQr: boolean
    stampSrc: string
    signatureSrc: string
    /** Signature width as % of previous default (42mm); 35 ≈ 3× smaller. */
    signatureScale: number
    /** Horizontal offset in mm (negative = left). */
    signatureOffsetX: number
    /** Vertical offset in mm (negative = up). */
    signatureOffsetY: number
    stampScale: number
    stampOffsetX: number
    stampOffsetY: number
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
    channel: "pdf" | "print" | "reprint"
    /** Full draft snapshot for reprint with same layout/QR. */
    snapshot?: ZahvalnicaDraft
    /** Marked invalid; verify page shows «недействительно», link still opens. */
    voided?: boolean
    voidedAt?: string
}

/** Design/layout state stored per background template. */
export type ZahvalnicaTemplateSettings = {
    background: ZahvalnicaBackground
    backgroundOpacity: number
    watermarkScale: number
    logoSrc: string
    typography: ZahvalnicaTypography
    titleFont: ZahvalnicaTitleFont
    customTitleFontData: string | null
    customTitleFontName: string
    bodyLineHeight: number
    showStamp: boolean
    showSignature: boolean
    showQr: boolean
    stampSrc: string
    signatureSrc: string
    signatureScale: number
    signatureOffsetX: number
    signatureOffsetY: number
    stampScale: number
    stampOffsetX: number
    stampOffsetY: number
    orgTitle: string
    title: string
    intro: string
    closing: string
    presidentLabel: string
    place: string
}

export const ZAHVALNICA_STORAGE_KEY = "portal.zahvalnica.draft"
export const ZAHVALNICA_NUMBER_KEY = "portal.zahvalnica.lastNumber"
export const ZAHVALNICA_HISTORY_KEY = "portal.zahvalnica.history"
export const ZAHVALNICA_VOIDED_KEY = "portal.zahvalnica.voidedIds"
export const ZAHVALNICA_BACKGROUNDS_KEY = "portal.zahvalnica.backgrounds"
export const ZAHVALNICA_TEMPLATE_SETTINGS_KEY = "portal.zahvalnica.templateSettings"
export const DEFAULT_LOGO = "/resources/zahvalnica-logo.png?v=2"
export const DEFAULT_BACKGROUND = "/resources/zahvalnica-bg.jpg"
export const DEFAULT_STAMP = "/resources/zahvalnica-stamp.png"
export const DEFAULT_SIGNATURE = "/resources/zahvalnica-signature.png"
export const MARCK_FONT_URL = "/resources/fonts/MarckScript-Regular.ttf"
export const MAGNOLIA_FONT_URL = "/resources/fonts/MagnoliaScript.otf"

/**
 * Preview panel targets ~420px wide for A4 (210mm) → ~2 px/mm.
 * Measure actual preview width when possible: pxPerMm = widthPx / 210.
 */
export const PREVIEW_PX_PER_MM = 2
export const A4_WIDTH_MM = 210

/** Convert jsPDF point size to CSS px on a preview scaled at `pxPerMm`. */
export const ptToPreviewPx = (pt: number, pxPerMm = PREVIEW_PX_PER_MM): number =>
    (pt * 25.4 * pxPerMm) / 72

/** Convert millimetres to CSS px on the same preview scale. */
export const mmToPreviewPx = (mm: number, pxPerMm = PREVIEW_PX_PER_MM): number => mm * pxPerMm

export type SavedBackground = {
    id: string
    name: string
    src: string
    builtin?: boolean
}

export const BUILTIN_BACKGROUNDS: SavedBackground[] = [
    {
        id: "builtin-default",
        name: "Šablon / Шаблон",
        src: DEFAULT_BACKGROUND,
        builtin: true,
    },
]

export const TITLE_FONT_CSS: Record<ZahvalnicaTitleFont, string> = {
    marck: '"Marck Script", cursive',
    magnolia: '"Magnolia Script", cursive',
    montserrat: '"Montserrat", sans-serif',
    custom: '"ZahvalnicaCustomTitle", cursive',
}

/** Base signature width in mm at signatureScale=100. */
export const SIGNATURE_BASE_WIDTH_MM = 42
/** Base stamp size in mm at stampScale=100 (standard wet stamp 40×40). */
export const STAMP_BASE_SIZE_MM = 40

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
        customTitleFontData: null,
        customTitleFontName: "",
        showStamp: true,
        showSignature: true,
        showQr: true,
        stampSrc: DEFAULT_STAMP,
        signatureSrc: DEFAULT_SIGNATURE,
        signatureScale: 35,
        signatureOffsetX: 0,
        signatureOffsetY: 0,
        stampScale: 100,
        stampOffsetX: 18,
        stampOffsetY: -8,
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
    if (
        raw.titleFont !== "marck" &&
        raw.titleFont !== "magnolia" &&
        raw.titleFont !== "montserrat" &&
        raw.titleFont !== "custom"
    ) {
        merged.titleFont = "marck"
    }
    if (raw.customTitleFontData === undefined) merged.customTitleFontData = null
    if (raw.customTitleFontName === undefined) merged.customTitleFontName = ""
    if (raw.showStamp == null) merged.showStamp = true
    if (raw.showSignature == null) merged.showSignature = true
    if (raw.showQr == null) merged.showQr = true
    if (!raw.stampSrc) merged.stampSrc = DEFAULT_STAMP
    if (!raw.signatureSrc) merged.signatureSrc = DEFAULT_SIGNATURE
    if (raw.signatureScale == null || Number.isNaN(Number(raw.signatureScale))) {
        merged.signatureScale = 35
    } else {
        merged.signatureScale = clamp(Number(raw.signatureScale), 10, 120)
    }
    if (raw.signatureOffsetX == null || Number.isNaN(Number(raw.signatureOffsetX))) {
        merged.signatureOffsetX = 0
    } else {
        merged.signatureOffsetX = clamp(Number(raw.signatureOffsetX), -40, 40)
    }
    if (raw.signatureOffsetY == null || Number.isNaN(Number(raw.signatureOffsetY))) {
        merged.signatureOffsetY = 0
    } else {
        merged.signatureOffsetY = clamp(Number(raw.signatureOffsetY), -30, 30)
    }
    if (raw.stampScale == null || Number.isNaN(Number(raw.stampScale))) {
        merged.stampScale = 100
    } else if (Number(raw.stampScale) === 85) {
        // Previous default made stamp ~32mm; migrate to true 40×40 at 100%
        merged.stampScale = 100
    } else {
        merged.stampScale = clamp(Number(raw.stampScale), 20, 140)
    }
    if (raw.stampOffsetX == null || Number.isNaN(Number(raw.stampOffsetX))) {
        merged.stampOffsetX = 18
    } else {
        merged.stampOffsetX = clamp(Number(raw.stampOffsetX), -40, 60)
    }
    if (raw.stampOffsetY == null || Number.isNaN(Number(raw.stampOffsetY))) {
        merged.stampOffsetY = -8
    } else {
        merged.stampOffsetY = clamp(Number(raw.stampOffsetY), -40, 40)
    }
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
    channel: "pdf" | "print" | "reprint",
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
        snapshot: { ...draft, typography: { ...draft.typography } },
        voided: false,
    }
    const next = [issue, ...loadZahvalnicaHistory()].slice(0, 500)
    try {
        localStorage.setItem(ZAHVALNICA_HISTORY_KEY, JSON.stringify(next))
        const n = Number(draft.number)
        if (!Number.isNaN(n) && n > 0) {
            localStorage.setItem(ZAHVALNICA_NUMBER_KEY, String(n))
        }
    } catch {
        /* ignore quota — retry without heavy custom font / data urls */
        try {
            const slim: ZahvalnicaIssue = {
                ...issue,
                snapshot: {
                    ...draft,
                    customTitleFontData: null,
                    logoSrc: draft.logoSrc.startsWith("data:") ? DEFAULT_LOGO : draft.logoSrc,
                    backgroundImageSrc:
                        draft.backgroundImageSrc && draft.backgroundImageSrc.startsWith("data:")
                            ? DEFAULT_BACKGROUND
                            : draft.backgroundImageSrc,
                    stampSrc: draft.stampSrc.startsWith("data:") ? DEFAULT_STAMP : draft.stampSrc,
                    signatureSrc: draft.signatureSrc.startsWith("data:")
                        ? DEFAULT_SIGNATURE
                        : draft.signatureSrc,
                    typography: { ...draft.typography },
                },
            }
            localStorage.setItem(
                ZAHVALNICA_HISTORY_KEY,
                JSON.stringify([slim, ...loadZahvalnicaHistory()].slice(0, 200))
            )
        } catch {
            /* ignore */
        }
    }
    return loadZahvalnicaHistory()
}

export const clearZahvalnicaHistory = () => {
    try {
        localStorage.removeItem(ZAHVALNICA_HISTORY_KEY)
    } catch {
        /* ignore */
    }
}

const persistHistory = (list: ZahvalnicaIssue[]) => {
    try {
        localStorage.setItem(ZAHVALNICA_HISTORY_KEY, JSON.stringify(list))
    } catch {
        /* ignore */
    }
}

export const loadVoidedZahvalnicaIds = (): string[] => {
    try {
        const raw = localStorage.getItem(ZAHVALNICA_VOIDED_KEY)
        if (!raw) return []
        const list = JSON.parse(raw) as string[]
        return Array.isArray(list) ? list.filter((id) => typeof id === "string") : []
    } catch {
        return []
    }
}

const persistVoidedIds = (ids: string[]) => {
    try {
        localStorage.setItem(ZAHVALNICA_VOIDED_KEY, JSON.stringify([...new Set(ids)].slice(0, 2000)))
    } catch {
        /* ignore */
    }
}

export const isZahvalnicaVoided = (issueId: string | null | undefined): boolean => {
    if (!issueId) return false
    return loadVoidedZahvalnicaIds().includes(issueId)
}

export const voidZahvalnicaIssue = (issueId: string): ZahvalnicaIssue[] => {
    const voidedAt = new Date().toISOString()
    persistVoidedIds([...loadVoidedZahvalnicaIds(), issueId])
    const next = loadZahvalnicaHistory().map((row) =>
        row.id === issueId ? { ...row, voided: true, voidedAt } : row
    )
    persistHistory(next)
    return next
}

export const voidAllZahvalnicaIssues = (): ZahvalnicaIssue[] => {
    const voidedAt = new Date().toISOString()
    const list = loadZahvalnicaHistory()
    persistVoidedIds([...loadVoidedZahvalnicaIds(), ...list.map((r) => r.id)])
    const next = list.map((row) => ({ ...row, voided: true, voidedAt: row.voidedAt || voidedAt }))
    persistHistory(next)
    return next
}

export const restoreZahvalnicaIssue = (issueId: string): ZahvalnicaIssue[] => {
    persistVoidedIds(loadVoidedZahvalnicaIds().filter((id) => id !== issueId))
    const next = loadZahvalnicaHistory().map((row) =>
        row.id === issueId ? { ...row, voided: false, voidedAt: undefined } : row
    )
    persistHistory(next)
    return next
}

export const deleteZahvalnicaIssue = (issueId: string): ZahvalnicaIssue[] => {
    const next = loadZahvalnicaHistory().filter((row) => row.id !== issueId)
    persistHistory(next)
    return next
}

export const extractTemplateSettings = (draft: ZahvalnicaDraft): ZahvalnicaTemplateSettings => ({
    background: draft.background,
    backgroundOpacity: draft.backgroundOpacity,
    watermarkScale: draft.watermarkScale,
    logoSrc: draft.logoSrc,
    typography: {
        org: { ...draft.typography.org },
        title: { ...draft.typography.title },
        name: { ...draft.typography.name },
        body: { ...draft.typography.body },
        sign: { ...draft.typography.sign },
        meta: { ...draft.typography.meta },
    },
    titleFont: draft.titleFont,
    customTitleFontData: draft.customTitleFontData,
    customTitleFontName: draft.customTitleFontName,
    bodyLineHeight: draft.bodyLineHeight,
    showStamp: draft.showStamp,
    showSignature: draft.showSignature,
    showQr: draft.showQr,
    stampSrc: draft.stampSrc,
    signatureSrc: draft.signatureSrc,
    signatureScale: draft.signatureScale,
    signatureOffsetX: draft.signatureOffsetX,
    signatureOffsetY: draft.signatureOffsetY,
    stampScale: draft.stampScale,
    stampOffsetX: draft.stampOffsetX,
    stampOffsetY: draft.stampOffsetY,
    orgTitle: draft.orgTitle,
    title: draft.title,
    intro: draft.intro,
    closing: draft.closing,
    presidentLabel: draft.presidentLabel,
    place: draft.place,
})

export const applyTemplateSettings = (
    draft: ZahvalnicaDraft,
    settings: ZahvalnicaTemplateSettings,
    backgroundImageSrc: string | null
): ZahvalnicaDraft => ({
    ...draft,
    ...settings,
    typography: {
        org: { ...settings.typography.org },
        title: { ...settings.typography.title },
        name: { ...settings.typography.name },
        body: { ...settings.typography.body },
        sign: { ...settings.typography.sign },
        meta: { ...settings.typography.meta },
    },
    backgroundImageSrc,
})

export const loadAllTemplateSettings = (): Record<string, ZahvalnicaTemplateSettings> => {
    try {
        const raw = localStorage.getItem(ZAHVALNICA_TEMPLATE_SETTINGS_KEY)
        if (!raw) return {}
        const map = JSON.parse(raw) as Record<string, ZahvalnicaTemplateSettings>
        return map && typeof map === "object" ? map : {}
    } catch {
        return {}
    }
}

export const saveTemplateSettingsFor = (templateId: string, settings: ZahvalnicaTemplateSettings) => {
    if (!templateId) return
    try {
        const all = loadAllTemplateSettings()
        all[templateId] = settings
        localStorage.setItem(ZAHVALNICA_TEMPLATE_SETTINGS_KEY, JSON.stringify(all))
    } catch {
        /* quota — drop custom font from this template and retry */
        try {
            const all = loadAllTemplateSettings()
            all[templateId] = { ...settings, customTitleFontData: null, customTitleFontName: "" }
            localStorage.setItem(ZAHVALNICA_TEMPLATE_SETTINGS_KEY, JSON.stringify(all))
        } catch {
            /* ignore */
        }
    }
}

export const loadTemplateSettingsFor = (templateId: string): ZahvalnicaTemplateSettings | null => {
    if (!templateId) return null
    return loadAllTemplateSettings()[templateId] || null
}

/** Rebuild draft for reprint from history row. */
export const draftFromIssue = (issue: ZahvalnicaIssue, fallback: ZahvalnicaDraft): ZahvalnicaDraft => {
    if (issue.snapshot) {
        return {
            ...fallback,
            ...issue.snapshot,
            volunteerName: issue.volunteerName,
            volunteerUsername: issue.volunteerUsername,
            number: issue.number,
            dateLabel: issue.dateLabel,
            place: issue.place || issue.snapshot.place,
            contribution: issue.contribution,
            presidentName: issue.presidentName || issue.snapshot.presidentName,
            typography: issue.snapshot.typography
                ? {
                      org: { ...fallback.typography.org, ...issue.snapshot.typography.org },
                      title: { ...fallback.typography.title, ...issue.snapshot.typography.title },
                      name: { ...fallback.typography.name, ...issue.snapshot.typography.name },
                      body: { ...fallback.typography.body, ...issue.snapshot.typography.body },
                      sign: { ...fallback.typography.sign, ...issue.snapshot.typography.sign },
                      meta: { ...fallback.typography.meta, ...issue.snapshot.typography.meta },
                  }
                : fallback.typography,
        }
    }
    return {
        ...fallback,
        volunteerName: issue.volunteerName,
        volunteerUsername: issue.volunteerUsername,
        number: issue.number,
        dateLabel: issue.dateLabel,
        place: issue.place || fallback.place,
        contribution: issue.contribution,
        presidentName: issue.presidentName || fallback.presidentName,
    }
}

export const loadSavedBackgrounds = (): SavedBackground[] => {
    let custom: SavedBackground[] = []
    try {
        const raw = localStorage.getItem(ZAHVALNICA_BACKGROUNDS_KEY)
        if (raw) {
            const list = JSON.parse(raw) as SavedBackground[]
            if (Array.isArray(list)) custom = list.filter((b) => b?.id && b?.src && !b.builtin)
        }
    } catch {
        /* ignore */
    }
    return [...BUILTIN_BACKGROUNDS, ...custom]
}

export const persistCustomBackgrounds = (all: SavedBackground[]) => {
    const custom = all.filter((b) => !b.builtin)
    try {
        localStorage.setItem(ZAHVALNICA_BACKGROUNDS_KEY, JSON.stringify(custom.slice(0, 12)))
    } catch {
        /* quota — drop oldest half and retry */
        try {
            localStorage.setItem(ZAHVALNICA_BACKGROUNDS_KEY, JSON.stringify(custom.slice(0, 4)))
        } catch {
            /* ignore */
        }
    }
}

export const addSavedBackground = (name: string, src: string): SavedBackground[] => {
    const nextItem: SavedBackground = {
        id: `bg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim() || "Фон",
        src,
    }
    const withoutDup = loadSavedBackgrounds().filter((b) => b.src !== src || b.builtin)
    const next = [...withoutDup.filter((b) => b.builtin), nextItem, ...withoutDup.filter((b) => !b.builtin)]
    persistCustomBackgrounds(next)
    return loadSavedBackgrounds()
}

export const removeSavedBackground = (id: string): SavedBackground[] => {
    const next = loadSavedBackgrounds().filter((b) => b.id !== id || b.builtin)
    persistCustomBackgrounds(next)
    try {
        const all = loadAllTemplateSettings()
        if (all[id]) {
            delete all[id]
            localStorage.setItem(ZAHVALNICA_TEMPLATE_SETTINGS_KEY, JSON.stringify(all))
        }
    } catch {
        /* ignore */
    }
    return loadSavedBackgrounds()
}

/** Shrink large images before storing in localStorage. */
export const compressImageDataUrl = async (
    dataUrl: string,
    maxSide = 1600,
    quality = 0.82
): Promise<string> => {
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image()
            el.onload = () => resolve(el)
            el.onerror = reject
            el.src = dataUrl
        })
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h)
        return canvas.toDataURL("image/jpeg", quality)
    } catch {
        return dataUrl
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
