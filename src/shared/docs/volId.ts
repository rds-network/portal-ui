import { UserInfoDto } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"

export type VolIdCountryCode = "SRB" | "RUS"

export type VolIdVerifyPayload = {
    v: 1
    id: string
    name: string
    username: string
    since: string
    issued: string
    validUntil: string
    issuedAt: string
    country?: VolIdCountryCode
}

export type VolIdCardData = {
    cardNumber: string
    name: string
    username: string
    photoUrl: string | null
    sinceYear: string
    issuedLabel: string
    validUntilLabel: string
    orgTitle: string
    countryCode: VolIdCountryCode
}

export const VOL_ID_ORG = "РУСКА ДИЈАСПОРА У СРБИЈИ"
export const VOL_ID_BG = "/resources/vol-id-bg.jpg"
export const VOL_ID_COUNTRY_OPTIONS: VolIdCountryCode[] = ["SRB", "RUS"]

const COUNTRY_STORAGE_PREFIX = "vol-id-country:"

export const loadVolIdCountry = (username: string): VolIdCountryCode | null => {
    try {
        const raw = localStorage.getItem(`${COUNTRY_STORAGE_PREFIX}${username}`)
        if (raw === "SRB" || raw === "RUS") return raw
    } catch {
        /* ignore */
    }
    return null
}

export const saveVolIdCountry = (username: string, code: VolIdCountryCode) => {
    try {
        localStorage.setItem(`${COUNTRY_STORAGE_PREFIX}${username}`, code)
    } catch {
        /* ignore */
    }
}

/** Guess ISO-style code from residence-permit nationality text. */
export const guessVolIdCountry = (user: UserInfoDto): VolIdCountryCode => {
    const raw = (user.residencePermits || [])
        .map((p) => p.nationality || "")
        .join(" ")
        .toLowerCase()
    if (/рус|ross|russia|russian|рф\b|rf\b/.test(raw)) return "RUS"
    if (/срб|serb|srbija|serbia/.test(raw)) return "SRB"
    // Issuing association operates in Serbia — default SRB for Euro-style badge
    return "SRB"
}

/** Stable card number from portal account id. */
export const cardNumberFromUserId = (id: number): string =>
    `RDS-V-${String(Math.max(0, id)).padStart(6, "0")}`

/** Far-future contract ends are stored as ~2099 for open-ended / бессрочные. */
const isOpenEndedEnd = (end: dayjs.Dayjs): boolean => end.year() >= 2090 || end.diff(dayjs(), "year") >= 40

const pickPrimaryContract = (user: UserInfoDto) => {
    const list = (user.contracts || [])
        .map((c) => ({
            start: dayjs(c.startDate),
            end: dayjs(c.endDate),
            type: c.type,
        }))
        .filter((c) => c.start.isValid())
    if (!list.length) return null
    // Prefer the contract that is still valid today; otherwise the latest by end date.
    const today = dayjs().startOf("day")
    const active = list
        .filter((c) => !c.end.isValid() || !c.end.isBefore(today))
        .sort((a, b) => b.end.valueOf() - a.end.valueOf())
    if (active.length) return active[0]
    return [...list].sort((a, b) => b.start.valueOf() - a.start.valueOf())[0]
}

export const buildVolIdCardData = (
    user: UserInfoDto,
    countryOverride?: VolIdCountryCode | null
): VolIdCardData => {
    const contract = pickPrimaryContract(user)
    const issued = contract?.start.isValid() ? contract.start : dayjs()
    let validUntilLabel: string
    if (!contract?.end.isValid()) {
        validUntilLabel = "Бессрочно / Open-ended"
    } else if (isOpenEndedEnd(contract.end)) {
        validUntilLabel = "Бессрочно / Open-ended"
    } else {
        validUntilLabel = contract.end.format("DD.MM.YYYY.")
    }
    const countryCode =
        countryOverride || loadVolIdCountry(user.username) || guessVolIdCountry(user)
    return {
        cardNumber: cardNumberFromUserId(user.id),
        name: (user.fullName || user.username || "—").trim(),
        username: user.username,
        photoUrl: user.avatar?.link || null,
        sinceYear: String(issued.year()),
        issuedLabel: issued.format("DD.MM.YYYY."),
        validUntilLabel,
        orgTitle: VOL_ID_ORG,
        countryCode,
    }
}

const toBase64Url = (bytes: Uint8Array): string => {
    let bin = ""
    bytes.forEach((b) => {
        bin += String.fromCharCode(b)
    })
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

const fromBase64Url = (token: string): Uint8Array => {
    const pad = token.length % 4 === 0 ? "" : "=".repeat(4 - (token.length % 4))
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/") + pad
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

export const encodeVolIdVerifyToken = (payload: VolIdVerifyPayload): string => {
    const json = JSON.stringify(payload)
    return toBase64Url(new TextEncoder().encode(json))
}

export const decodeVolIdVerifyToken = (token: string): VolIdVerifyPayload | null => {
    try {
        const json = new TextDecoder().decode(fromBase64Url(token.trim()))
        const data = JSON.parse(json) as VolIdVerifyPayload
        if (data?.v !== 1 || !data.name || !data.id) return null
        return data
    } catch {
        return null
    }
}

export const buildVolIdVerifyUrl = (token: string, origin = window.location.origin): string =>
    `${origin}/vol-id/verify?t=${encodeURIComponent(token)}`

export const buildVolIdPayload = (card: VolIdCardData): VolIdVerifyPayload => ({
    v: 1,
    id: card.cardNumber,
    name: card.name,
    username: card.username,
    since: card.sinceYear,
    issued: card.issuedLabel,
    validUntil: card.validUntilLabel,
    issuedAt: new Date().toISOString(),
    country: card.countryCode,
})
