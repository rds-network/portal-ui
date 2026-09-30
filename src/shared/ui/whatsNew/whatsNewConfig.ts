/** Bump when the tour steps change so users see the tour again. */
export const WHATS_NEW_VERSION = "2026-09-30-v1"
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
}

export const WHATS_NEW_STEPS: WhatsNewStep[] = [
    {
        id: "welcome",
        titleId: "whatsNew.welcome.title",
        bodyId: "whatsNew.welcome.body",
    },
    {
        id: "messages",
        target: '[data-tour-id="nav-messages"]',
        titleId: "whatsNew.messages.title",
        bodyId: "whatsNew.messages.body",
        needsNav: true,
    },
    {
        id: "chat",
        target: '[data-tour-id="nav-chat"]',
        titleId: "whatsNew.chat.title",
        bodyId: "whatsNew.chat.body",
        needsNav: true,
    },
    {
        id: "ideas",
        target: '[data-tour-id="nav-ideas"]',
        titleId: "whatsNew.ideas.title",
        bodyId: "whatsNew.ideas.body",
        needsNav: true,
    },
    {
        id: "leave",
        target: '[data-tour-id="nav-leave"]',
        titleId: "whatsNew.leave.title",
        bodyId: "whatsNew.leave.body",
        needsNav: true,
    },
    {
        id: "dissolution",
        target: '[data-tour-id="nav-dissolution"]',
        titleId: "whatsNew.dissolution.title",
        bodyId: "whatsNew.dissolution.body",
        needsNav: true,
    },
    {
        id: "tasks",
        target: '[data-tour-id="nav-tasks"]',
        titleId: "whatsNew.tasks.title",
        bodyId: "whatsNew.tasks.body",
        needsNav: true,
    },
    {
        id: "resources",
        target: '[data-tour-id="nav-resources"]',
        titleId: "whatsNew.resources.title",
        bodyId: "whatsNew.resources.body",
        needsNav: true,
    },
    {
        id: "bell",
        target: '[data-tour-id="header-bell"]',
        titleId: "whatsNew.bell.title",
        bodyId: "whatsNew.bell.body",
    },
    {
        id: "done",
        titleId: "whatsNew.done.title",
        bodyId: "whatsNew.done.body",
    },
]
