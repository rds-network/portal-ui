import {
    IconAdjustments,
    IconBell,
    IconChecklist,
    IconClipboardCheck,
    IconFileAnalytics,
    IconFilePlus,
    IconFileText,
    IconHistory,
    IconHome,
    IconLifebuoy,
    IconLink,
    IconMap,
    IconSpeakerphone,
    IconUserPlus,
    IconUsers,
    IconUsersGroup,
    IconChartBar,
    IconAlertTriangle,
    IconBook,
    IconBeach,
} from "@tabler/icons-react"
import { ItemGroupProps } from "src/shared/ui/appNavbar/AppNavbar"

export type NavSection = {
    label: string
    items: ItemGroupProps[]
}

/** Flat sections like Clanovi / Uglavnom — equal left padding for every row. */
export const Content: NavSection[] = [
    {
        label: "navbar.sections.work",
        items: [
            {
                label: "navbar.desktop",
                icon: IconHome,
                link: "/",
            },
            {
                label: "navbar.reports.tasks",
                icon: IconChecklist,
                link: "/tasks",
            },
            {
                label: "navbar.resources",
                icon: IconLink,
                link: "/resources",
            },
            {
                label: "navbar.reports.messages",
                icon: IconBell,
                link: "/messages",
                showUnread: true,
            },
            {
                label: "navbar.leave",
                icon: IconBeach,
                link: "/leave",
            },
            {
                label: "navbar.reports.review",
                icon: IconClipboardCheck,
                link: "/reports/review",
                showIfCurator: true,
                curatorInbox: true,
                roles: ["ADMIN", "ADMIN_VOLUNTEER", "MAIN_VOLUNTEER"],
            },
        ],
    },
    {
        label: "navbar.sections.reporting",
        items: [
            {
                label: "navbar.reports.my-reports",
                icon: IconFileText,
                link: "/reports/personal",
            },
            {
                label: "navbar.reports.new-report",
                icon: IconFilePlus,
                link: "/report/create",
            },
            {
                label: "navbar.reports.reporting-guide",
                icon: IconBook,
                link: "/reporting-guide",
            },
        ],
    },
    {
        label: "navbar.sections.admin",
        items: [
            {
                label: "navbar.reports.all",
                icon: IconFileAnalytics,
                link: "/reports",
                roles: ["ADMIN_VOLUNTEER"],
            },
            {
                label: "navbar.reports.heat-map",
                icon: IconMap,
                link: "/volunteers/heatmap",
                roles: ["ADMIN_VOLUNTEER"],
                showIfCurator: true,
            },
            {
                label: "navbar.reports.overdue",
                icon: IconAlertTriangle,
                link: "/reports/overdue",
                roles: ["ADMIN_VOLUNTEER"],
            },
            {
                label: "navbar.volunteers.applications",
                icon: IconUserPlus,
                link: "/applications",
                roles: ["ADMIN_VOLUNTEER", "INTERVIEWER"],
                showApplications: true,
            },
            {
                label: "navbar.volunteers.all-volunteers",
                icon: IconUsers,
                link: "/volunteers",
                roles: ["ADMIN_VOLUNTEER", "ADMIN_SSO"],
            },
            {
                label: "navbar.volunteers.curators",
                icon: IconUsersGroup,
                link: "/curators",
                roles: ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO", "MAIN_VOLUNTEER"],
            },
            {
                label: "navbar.volunteers.statistics",
                icon: IconChartBar,
                link: "/volunteers/reports",
                roles: ["ADMIN_VOLUNTEER"],
            },
            {
                label: "navbar.reports.announcements",
                icon: IconSpeakerphone,
                link: "/announcements/admin",
                roles: ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO", "MAIN_VOLUNTEER"],
                showIfCurator: true,
            },
            {
                label: "navbar.activity",
                icon: IconHistory,
                link: "/activity",
                roles: ["ADMIN", "ADMIN_SSO"],
            },
        ],
    },
    {
        label: "navbar.sections.system",
        items: [
            {
                label: "navbar.account-settings",
                icon: IconAdjustments,
                link: "https://id.russian.rs/if/user/#/settings",
            },
            {
                label: "navbar.support",
                icon: IconLifebuoy,
                link: "/support",
            },
        ],
    },
]

