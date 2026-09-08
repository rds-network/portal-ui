import { Avatar, Tooltip } from "@mantine/core"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import { useIntl } from "react-intl"

export const ApplicationAssigneeAvatar = ({ login, user }: { login?: string | null; user?: UserInfoDto }) => {
    const intl = useIntl()
    const name = user?.fullName || login
    const label = name
        ? `${intl.formatMessage({ id: "pages.applications.assignee" })}: ${name}`
        : intl.formatMessage({ id: "pages.applications.unassigned" })

    return (
        <Tooltip label={label} withArrow events={{ hover: true, focus: true, touch: true }}>
            <Avatar
                src={user?.avatar?.link}
                name={name || undefined}
                size={28}
                radius="xl"
                color={name ? "initials" : "gray"}
                aria-label={label}
                tabIndex={0}
                style={{ flexShrink: 0 }}
            />
        </Tooltip>
    )
}
