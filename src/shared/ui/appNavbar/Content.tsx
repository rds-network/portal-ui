import { IconAdjustments, IconBell, IconChecklist, IconFileAnalytics, IconHistory, IconLifebuoy, IconLink, IconUsers } from "@tabler/icons-react"
import { ItemGroupProps } from "src/shared/ui/appNavbar/AppNavbar"

export const Content: ItemGroupProps[] = [
    {
        label: "navbar.reports.tasks",
        icon: IconChecklist,
        link: "/tasks",
    },
    {
        label: "navbar.reports.messages",
        icon: IconBell,
        link: "/messages",
        showUnread: true,
    },
    {
        label: "navbar.reports.reporting",
        icon: IconFileAnalytics,
        initiallyOpened: true,
        items: [
            {
                label: "navbar.reports.my-reports",
                link: "/reports/personal",
            },
            {
                label: "navbar.reports.new-report",
                link: "/report/create",
            },
            {
                label: "navbar.reports.reporting-guide",
                link: "/reporting-guide",
            },
            {
                label: "navbar.reports.all",
                link: "/reports",
                roles: ["ADMIN_VOLUNTEER"],
            },
            {
                label: "navbar.reports.heat-map",
                link: "/volunteers/heatmap",
                roles: ["ADMIN_VOLUNTEER"],
            },
            {
                label: "navbar.reports.overdue",
                link: "/reports/overdue",
                roles: ["ADMIN_VOLUNTEER"],
            },
        ],
    },
    {
        label: "navbar.volunteers.volunteers",
        icon: IconUsers,
        initiallyOpened: true,
        items: [
            {
                label: "navbar.volunteers.all-volunteers",
                link: "/volunteers",
                roles: ["ADMIN_VOLUNTEER", "ADMIN_SSO"],
            },
            {
                label: "navbar.volunteers.applications",
                link: "/applications",
                roles: ["ADMIN_VOLUNTEER", "INTERVIEWER"],
            },
            {
                label: "navbar.volunteers.statistics",
                link: "/volunteers/reports",
                roles: ["ADMIN_VOLUNTEER"],
            },
            {
                label: "navbar.volunteers.curators",
                link: "/curators",
                roles: ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO", "MAIN_VOLUNTEER"],
            },
            {
                label: "navbar.reports.announcements",
                link: "/announcements/admin",
                roles: ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO"],
            },
        ],
        roles: ["ADMIN_VOLUNTEER", "ADMIN_SSO", "INTERVIEWER", "ADMIN", "MAIN_VOLUNTEER"],
    },
    {
        label: "navbar.activity",
        icon: IconHistory,
        link: "/activity",
        roles: ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO"],
    },
    {
        label: "navbar.account-settings",
        icon: IconAdjustments,
        link: "https://id.russian.rs/if/user/#/settings",
    },
    {
        label: "navbar.resources",
        icon: IconLink,
        link: "/resources",
    },
    {
        label: "navbar.support",
        icon: IconLifebuoy,
        link: "/support",
    },
]
