export const downloadCsv = (filename: string, rows: (string | number | boolean | null | undefined)[][]) => {
    const text = rows
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
        .join("\n")
    const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}
