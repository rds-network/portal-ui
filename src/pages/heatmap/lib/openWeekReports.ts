export const HEATMAP_RETURN_KEY = "heatmapReturnTo"

export function rememberHeatmapReturn() {
    sessionStorage.setItem(HEATMAP_RETURN_KEY, `${window.location.pathname}${window.location.search}`)
}

export function heatmapReportsPath(params: Record<string, string>) {
    const query = new URLSearchParams({ ...params, from: "heatmap" })
    return `/reports?${query.toString()}`
}

export function heatmapReturnPath() {
    return sessionStorage.getItem(HEATMAP_RETURN_KEY) || "/volunteers/heatmap"
}
