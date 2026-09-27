import { PageRequest, PageResponse, ReportFilter } from "@rds-network/portal-api-axios"

export const locales = {
    documentTitle: "pages.my-reports.title",
    total: "pages.my-reports.total",
    filters: "pages.my-reports.filters",
    resetFilters: "common.reset-filters",
    newReport: "pages.my-reports.new-report",
    reportCreated: "pages.my-reports.report.created",
    reportStatus: "pages.my-reports.report.status",
    reportTaskCount: "pages.my-reports.report.task-count",
    reportTimeSpent: "pages.my-reports.report.time-spent",
    reportWeek: "pages.my-reports.report.week",
    emptyReports: "pages.my-reports.empty-reports",

    heatmapDescription: "pages.my-reports.heatmap.description",
    hours: "pages.my-reports.heatmap.hours",
    tooltipReports: "pages.my-reports.heatmap.tooltipReports",
    tooltipWeek: "pages.my-reports.heatmap.tooltipWeek",
    tooltipNA: "pages.my-reports.heatmap.tooltipNA",
    tooltipWaiting: "pages.my-reports.heatmap.tooltipWaiting",
    noReports: "pages.my-reports.heatmap.noReports",
    partialReports: "pages.my-reports.heatmap.partialReports",
    fullReports: "pages.my-reports.heatmap.fullReports",
    overtimeReports: "pages.my-reports.heatmap.overtimeReports",

    generatePDF: "pages.my-reports.pdf.generate-pdf",
    printPDF: "pages.my-reports.pdf.print-pdf",
    pdfPeriodStart: "pages.my-reports.pdf.period-start",
    pdfPeriodEnd: "pages.my-reports.pdf.period-end",
    invalidDateRange: "pages.my-reports.pdf.invalid-date-range",
    noReportsFound: "pages.my-reports.pdf.noReportsFound",
    somethingWentWrong: "pages.notFound.title",
    pdfTestNotice: "pages.my-reports.pdf.pdfTestNotice",
}

export const defaultPage: PageRequest = {
    pageNumber: 0,
    pageSize: 5,
    sort: ["createTime;desc"],
}

export const defaultPageResponse: PageResponse = {
    pageNumber: 0,
    pageSize: 5,
    totalPages: 1,
    totalElements: 0,
}

export const defaultFilter: ReportFilter = {
    login: null,
    dateFrom: null,
    dateTo: null,
    status: null,
    program: null,
}
