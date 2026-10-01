export type ZahvalnicaVerifyPayload = {
    v: 1
    id: string
    name: string
    number: string
    date: string
    place: string
    contribution: string
    president: string
    issuedAt: string
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

export const encodeZahvalnicaVerifyToken = (payload: ZahvalnicaVerifyPayload): string => {
    const json = JSON.stringify(payload)
    return toBase64Url(new TextEncoder().encode(json))
}

export const decodeZahvalnicaVerifyToken = (token: string): ZahvalnicaVerifyPayload | null => {
    try {
        const json = new TextDecoder().decode(fromBase64Url(token.trim()))
        const data = JSON.parse(json) as ZahvalnicaVerifyPayload
        if (data?.v !== 1 || !data.name || !data.number) return null
        return data
    } catch {
        return null
    }
}

export const buildZahvalnicaVerifyUrl = (token: string, origin = window.location.origin): string =>
    `${origin}/zahvalnica/verify?t=${encodeURIComponent(token)}`
