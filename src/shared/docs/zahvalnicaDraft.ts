export type ZahvalnicaBackground = "white" | "navy" | "soft"

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
    typography: ZahvalnicaTypography
}

export type ZahvalnicaIssue = {
    id: string
    volunteerName: string
    volunteerUsername: string | null
    number: string
    dateLabel: string
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

export const defaultTypography = (): ZahvalnicaTypography => ({
    org: { size: 11, color: "#1a365d", bold: true },
    title: { size: 26, color: "#14233c", bold: true },
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
        backgroundImageSrc: DEFAULT_LOGO,
        backgroundOpacity: 12,
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
        merged.backgroundOpacity = 12
    } else {
        merged.backgroundOpacity = Math.min(100, Math.max(0, Number(raw.backgroundOpacity)))
    }
    if (raw.backgroundImageSrc === undefined) {
        merged.backgroundImageSrc = DEFAULT_LOGO
    }
    if (raw.volunteerUsername === undefined) merged.volunteerUsername = null
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
        // Do not persist huge data-URLs for logo/bg forever if too large — keep paths when possible
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
    channel: "pdf" | "print"
): ZahvalnicaIssue[] => {
    const issue: ZahvalnicaIssue = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        volunteerName: draft.volunteerName.trim(),
        volunteerUsername: draft.volunteerUsername,
        number: draft.number,
        dateLabel: draft.dateLabel,
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
