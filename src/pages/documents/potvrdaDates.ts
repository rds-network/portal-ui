import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"

dayjs.extend(customParseFormat)

const DATE_FORMATS = ["DD.MM.YYYY", "DD.MM.YYYY.", "YYYY-MM-DD"]

/** API date (YYYY-MM-DD) from portal form text. */
export function toApiDate(value: string | null | undefined): string | null {
    const trimmed = value?.trim()
    if (!trimmed) return null
    const parsed = dayjs(trimmed, DATE_FORMATS, true)
    if (!parsed.isValid()) return null
    return parsed.format("YYYY-MM-DD")
}

export function issueYearFromFormDate(value: string | null | undefined): number {
    const api = toApiDate(value)
    if (api) return dayjs(api).year()
    return dayjs().year()
}
