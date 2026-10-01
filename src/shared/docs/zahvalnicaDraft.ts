export type ZahvalnicaBackground = "white" | "navy" | "soft"

export type ZahvalnicaDraft = {
    orgTitle: string
    title: string
    volunteerName: string
    intro: string
    contribution: string
    closing: string
    presidentLabel: string
    presidentName: string
    place: string
    dateLabel: string
    number: string
    background: ZahvalnicaBackground
    /** data URL or public path */
    logoSrc: string
    /** optional custom background / watermark image */
    backgroundImageSrc: string | null
    /** 0–100 opacity for background/watermark image */
    backgroundOpacity: number
}

export const ZAHVALNICA_STORAGE_KEY = "portal.zahvalnica.draft"
export const ZAHVALNICA_NUMBER_KEY = "portal.zahvalnica.lastNumber"
export const DEFAULT_LOGO = "/resources/zahvalnica-logo.png"

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
        // Logo as soft watermark by default
        backgroundImageSrc: DEFAULT_LOGO,
        backgroundOpacity: 12,
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

const migrateDraft = (raw: Partial<ZahvalnicaDraft>): ZahvalnicaDraft => {
    const base = defaultZahvalnicaDraft()
    const merged = { ...base, ...raw }
    // Drop old yellow parchment theme and old square jpg logo from saved drafts
    if ((raw as { background?: string }).background === "parchment") {
        merged.background = "white"
    }
    if (
        !raw.logoSrc ||
        raw.logoSrc.includes("zahvalnica-logo.jpg") ||
        raw.logoSrc.includes("zahvalnica-logo.jpg")
    ) {
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
        /* ignore */
    }
}

export const BACKGROUND_COLORS: Record<
    ZahvalnicaBackground,
    { page: [number, number, number]; text: [number, number, number]; accent: [number, number, number] }
> = {
    white: { page: [255, 255, 255], text: [20, 35, 60], accent: [26, 54, 93] },
    navy: { page: [18, 36, 68], text: [250, 250, 250], accent: [220, 190, 100] },
    soft: { page: [232, 240, 248], text: [20, 40, 70], accent: [40, 90, 140] },
}
