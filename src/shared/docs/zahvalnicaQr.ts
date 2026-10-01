import qrcode from "./vendor/qrcode.mjs"
import { stringToBytes as utf8Bytes } from "./vendor/qrcode_UTF8.mjs"

type QrFactory = {
    (typeNumber: number, errorCorrectionLevel: string): {
        addData: (data: string) => void
        make: () => void
        createDataURL: (cellSize?: number, margin?: number) => string
    }
    stringToBytes: (s: string) => number[]
}

const qrFactory = qrcode as unknown as QrFactory
qrFactory.stringToBytes = utf8Bytes as (s: string) => number[]

/** Small QR as PNG data-URL for embedding into PDF / preview. */
export const makeQrDataUrl = (text: string, cellSize = 3, margin = 1): string => {
    const qr = qrFactory(0, "M")
    qr.addData(text)
    qr.make()
    return qr.createDataURL(cellSize, margin)
}
