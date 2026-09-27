const EKOMAPA_HOST = "https://ekomapa.rs"

/**
 * Build / normalize location for portal events from Ekomapa codes or pasted map links.
 * Point:  EKO-237  → https://ekomapa.rs/map?trash_point=237
 * Route:  route 165 / маршрут 165 → https://ekomapa.rs/map?route=165
 * Also extracts map URL from pasted clean-city report snippets.
 */
export function normalizeEventLocation(raw: string): string {
    const value = raw.trim()
    if (!value) return value

    const fromSnippet =
        value.match(/https?:\/\/(?:www\.)?ekomapa\.rs\/map\?[^\s,)\]"']+/i) ||
        value.match(/(?:^|[\s:])(?:www\.)?ekomapa\.rs\/map\?[^\s,)\]"']+/i)
    if (fromSnippet) {
        let url = fromSnippet[0].replace(/^[\s:]+/, "")
        if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/\//, "")}`
        return sanitizeEkomapaMapUrl(url) || url
    }

    const eko = value.match(/^EKO-?#?\s*(\d+)$/i)
    if (eko) return `${EKOMAPA_HOST}/map?trash_point=${eko[1]}`

    const route = value.match(/^(?:маршрут|route)\s*#?\s*(\d+)$/i)
    if (route) return `${EKOMAPA_HOST}/map?route=${route[1]}`

    if (/^https?:\/\//i.test(value) && /ekomapa\.rs\/map/i.test(value)) {
        return sanitizeEkomapaMapUrl(value) || value
    }

    return value
}

export function isEkomapaMapUrl(value?: string | null): boolean {
    if (!value) return false
    return /ekomapa\.rs\/map\?(?:trash_point|route)=\d+/i.test(value.trim())
}

export function ekomapaLocationLabel(value?: string | null): string | null {
    if (!value) return null
    const point = value.match(/[?&]trash_point=(\d+)/i)
    if (point) return `EKO-${point[1]}`
    const route = value.match(/[?&]route=(\d+)/i)
    if (route) return `Маршрут #${route[1]}`
    return null
}

function sanitizeEkomapaMapUrl(url: string): string | null {
    try {
        const parsed = new URL(url.includes("://") ? url : `https://${url}`)
        if (!/ekomapa\.rs$/i.test(parsed.hostname.replace(/^www\./, ""))) return null
        const point = parsed.searchParams.get("trash_point")
        const route = parsed.searchParams.get("route")
        if (point && /^\d+$/.test(point)) return `${EKOMAPA_HOST}/map?trash_point=${point}`
        if (route && /^\d+$/.test(route)) return `${EKOMAPA_HOST}/map?route=${route}`
        return null
    } catch {
        return null
    }
}
