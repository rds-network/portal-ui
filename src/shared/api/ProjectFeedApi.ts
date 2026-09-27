export type ProjectFeedItem = {
    source: "uglavnom" | "guides" | "laws"
    title: string
    subtitle: string
    url: string
    tag: string
}

const UGLAVNOM_NEWS = "https://uglavnom.rs/news_api.php?limit=1&lang=ru"
const GUIDES_API = "https://russian.rs/guides_list_api.php?limit=1"
const LAWS_API = "https://russian.rs/laws_list_api.php?limit=1"

async function fetchJson<T>(url: string): Promise<T | null> {
    try {
        const response = await fetch(url, { credentials: "omit" })
        if (!response.ok) return null
        return (await response.json()) as T
    } catch {
        return null
    }
}

type UglRow = {
    title?: string
    title_sr?: string
    url?: string
    url_ru?: string
    url_short?: string
    description?: string
    category?: string
}

type GuidesResponse = {
    guides?: Array<{ title?: string; link?: string; description?: string; category?: string }>
}

type LawsResponse = {
    laws?: Array<{ title?: string; link?: string; desc?: string; slug?: string }>
}

export async function fetchProjectFeed(): Promise<ProjectFeedItem[]> {
    const [uglavnom, guides, laws] = await Promise.all([
        fetchJson<UglRow[]>(UGLAVNOM_NEWS),
        fetchJson<GuidesResponse>(GUIDES_API),
        fetchJson<LawsResponse>(LAWS_API),
    ])

    const items: ProjectFeedItem[] = []

    const ugl = Array.isArray(uglavnom) ? uglavnom[0] : null
    if (ugl?.title) {
        items.push({
            source: "uglavnom",
            title: ugl.title,
            subtitle: "Новости и аналитика",
            url: ugl.url_ru || ugl.url || ugl.url_short || "https://uglavnom.rs",
            tag: "UGLAVNOM",
        })
    }

    const guide = guides?.guides?.[0]
    if (guide?.title) {
        items.push({
            source: "guides",
            title: guide.title,
            subtitle: "Практические инструкции",
            url: guide.link || "https://russian.rs/guides",
            tag: "ГАЙДЫ",
        })
    }

    const law = laws?.laws?.[0]
    if (law?.title) {
        items.push({
            source: "laws",
            title: law.title,
            subtitle: "Нормативная база",
            url: law.link || (law.slug ? `https://russian.rs/law/${law.slug}` : "https://russian.rs/laws"),
            tag: "ЗАКОНЫ",
        })
    }

    return items
}
