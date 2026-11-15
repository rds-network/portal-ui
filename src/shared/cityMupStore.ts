const STORAGE_KEY = 'city-mup-data-v1'

export type CityMupEntry = {
    mupName: string
    mupEmail: string
    updatedAt: string
    updatedBy: string
}

type CityMupData = Record<string, CityMupEntry>

const normalizeCity = (city: string) => city.trim().toLowerCase()

export function getCityMupEntry(city: string): CityMupEntry | null {
    if (!city) return null
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const data: CityMupData = JSON.parse(raw)
        return data[normalizeCity(city)] ?? null
    } catch {
        return null
    }
}

export function setCityMupEntry(
    city: string,
    patch: { mupName?: string; mupEmail?: string },
    editorUsername: string
): void {
    if (!city) return
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        const data: CityMupData = raw ? JSON.parse(raw) : {}
        const key = normalizeCity(city)
        const existing = data[key] ?? { mupName: '', mupEmail: '', updatedAt: '', updatedBy: '' }
        data[key] = {
            ...existing,
            ...patch,
            updatedAt: new Date().toISOString(),
            updatedBy: editorUsername,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
        // localStorage unavailable — ignore silently
    }
}
