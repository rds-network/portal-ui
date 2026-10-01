import { UserInfoDto } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"

export type VolIdVerifyPayload = {
    v: 1
    id: string
    name: string
    username: string
    since: string
    issued: string
    validUntil: string
    issuedAt: string
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
}

export const VOL_ID_ORG = "РУСКА ДИЈАСПОРА У СРБИЈИ"
export const VOL_ID_LOGO = "/resources/zahvalnica-logo.png?v=2"

/** Stable card number from portal account id. */
export const cardNumberFromUserId = (id: number): string =>
    `RDS-V-${String(Math.max(0, id)).padStart(6, "0")}`

const earliestContractStart = (user: UserInfoDto): dayjs.Dayjs | null => {
    const dates = (user.contracts || [])
        .map((c) => dayjs(c.startDate))
        .filter((d) => d.isValid())
        .sort((a, b) => a.valueOf() - b.valueOf())
    return dates[0] || null
}

export const buildVolIdCardData = (user: UserInfoDto): VolIdCardData => {
    const start = earliestContractStart(user)
    const issued = start || dayjs()
    const validUntil = issued.add(1, "year")
    return {
        cardNumber: cardNumberFromUserId(user.id),
        name: (user.fullName || user.username || "—").trim(),
        username: user.username,
        photoUrl: user.avatar?.link || null,
        sinceYear: String(issued.year()),
        issuedLabel: issued.format("DD.MM.YYYY."),
        validUntilLabel: validUntil.format("DD.MM.YYYY."),
        orgTitle: VOL_ID_ORG,
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
})
