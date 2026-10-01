type TypeNumber =
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31
    | 32
    | 33
    | 34
    | 35
    | 36
    | 37
    | 38
    | 39
    | 40

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H"
type Mode = "Numeric" | "Alphanumeric" | "Byte" | "Kanji"

interface QRCode {
    addData(data: string, mode?: Mode): void
    make(): void
    getModuleCount(): number
    isDark(row: number, col: number): boolean
    createDataURL(cellSize?: number, margin?: number): string
}

interface QRCodeFactory {
    (typeNumber: TypeNumber, errorCorrectionLevel: ErrorCorrectionLevel): QRCode
    stringToBytes: (s: string) => number[]
}

declare module "./qrcode.mjs" {
    const qrcode: QRCodeFactory
    export default qrcode
}

declare module "./qrcode_UTF8.mjs" {
    export const stringToBytes: (s: string) => number[]
}
