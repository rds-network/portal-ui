/** Bump when the tour steps change so users see the tour again. */
export const WHATS_NEW_VERSION = "2026-10-01-v1"
export const WHATS_NEW_STORAGE_KEY = "portal.whatsNew.seen"
export const WHATS_NEW_START_EVENT = "portal-whats-new-start"

export const hasSeenWhatsNew = (): boolean => {
    try {
        return localStorage.getItem(WHATS_NEW_STORAGE_KEY) === WHATS_NEW_VERSION
    } catch {
        return true
    }
}

export const markWhatsNewSeen = () => {
    try {
        localStorage.setItem(WHATS_NEW_STORAGE_KEY, WHATS_NEW_VERSION)
    } catch {
        /* ignore */
    }
}

export const startWhatsNewTour = () => {
    window.dispatchEvent(new Event(WHATS_NEW_START_EVENT))
}

export type WhatsNewStep = {
    id: string
    /** CSS selector; omit for centered intro/outro */
    target?: string
    titleId: string
    bodyId: string
    /** Open mobile drawer before highlighting nav */
    needsNav?: boolean
    /** Navigate here before measuring the target */
    route?: string
}

/**
 * Content is code-configured (not an admin CMS).
 * Bump WHATS_NEW_VERSION when steps/copy change so returning users see the tour again.
 */
export const WHATS_NEW_STEPS: WhatsNewStep[] = [
    {
        id: "welcome",
        titleId: "whatsNew.welcome.title",
        bodyId: "whatsNew.welcome.body",
    },
    {
        id: "desktop",
        route: "/",
        target: '[data-tour-id="desktop-root"]',
        titleId: "whatsNew.desktop.title",
        bodyId: "whatsNew.desktop.body",
    },
    {
        id: "desktop-tasks",
        route: "/",
        target: '[data-tour-id="desktop-tasks"]',
        titleId: "whatsNew.desktopTasks.title",
        bodyId: "whatsNew.desktopTasks.body",
    },
    {
        id: "desktop-messages",
        route: "/",
        target: '[data-tour-id="desktop-messages"]',
        titleId: "whatsNew.desktopMessages.title",
        bodyId: "whatsNew.desktopMessages.body",
    },
    {
        id: "desktop-events",
        route: "/",
        target: '[data-tour-id="desktop-events"]',
        titleId: "whatsNew.desktopEvents.title",
        bodyId: "whatsNew.desktopEvents.body",
    },
    {
        id: "desktop-reports",
        route: "/",
        target: '[data-tour-id="desktop-reports"]',
        titleId: "whatsNew.desktopReports.title",
        bodyId: "whatsNew.desktopReports.body",
    },
    {
        id: "report-remarks",
        route: "/",
        target: '[data-tour-id="report-remark"]',
        titleId: "whatsNew.reportRemarks.title",
        bodyId: "whatsNew.reportRemarks.body",
    },
    {
        id: "report-customer",
        titleId: "whatsNew.reportCustomer.title",
        bodyId: "whatsNew.reportCustomer.body",
    },
    {
        id: "ideas",
        route: "/ideas",
        target: '[data-tour-id="ideas-publish"]',
        titleId: "whatsNew.ideas.title",
        bodyId: "whatsNew.ideas.body",
    },
    {
        id: "ideas-respond",
        route: "/ideas",
        target: '[data-tour-id="ideas-respond"]',
        titleId: "whatsNew.ideasRespond.title",
        bodyId: "whatsNew.ideasRespond.body",
    },
    {
        id: "leave",
        route: "/leave",
        target: '[data-tour-id="leave-form"]',
        titleId: "whatsNew.leave.title",
        bodyId: "whatsNew.leave.body",
    },
    {
        id: "achievements",
        route: "/achievements",
        target: '[data-tour-id="achievements-root"]',
        titleId: "whatsNew.achievements.title",
        bodyId: "whatsNew.achievements.body",
    },
    {
        id: "tasks",
        route: "/tasks",
        target: '[data-tour-id="tasks-board"]',
        titleId: "whatsNew.tasks.title",
        bodyId: "whatsNew.tasks.body",
    },
    {
        id: "bell",
        target: '[data-tour-id="header-bell"]',
        titleId: "whatsNew.bell.title",
        bodyId: "whatsNew.bell.body",
    },
    {
        id: "configure",
        target: '[data-tour-id="whats-new-open"]',
        titleId: "whatsNew.configure.title",
        bodyId: "whatsNew.configure.body",
    },
    {
        id: "done",
        titleId: "whatsNew.done.title",
        bodyId: "whatsNew.done.body",
    },
]
