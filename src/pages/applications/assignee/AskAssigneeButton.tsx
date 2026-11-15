import { ActionIcon, Button, Tooltip } from "@mantine/core"
import { ApplicationDto, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconMessageCircle } from "@tabler/icons-react"
import { useContext, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { InboxNotifyModal } from "src/shared/ui/inbox/InboxNotifyModal"
import { hasPermission, UserGroup } from "src/shared/user/roles"

type Props = {
    application: ApplicationDto
    assigneeUser?: UserInfoDto
    /** Compact icon (card) or labeled button (detail). */
    variant?: "icon" | "button"
}

export const AskAssigneeButton = ({ application, assigneeUser, variant = "icon" }: Props) => {
    const intl = useIntl()
    const { user } = useContext(UserContext)
    const [opened, setOpened] = useState(false)

    const canAsk = hasPermission(user, [
        UserGroup.ADMIN,
        UserGroup.ADMIN_SSO,
        UserGroup.ADMIN_VOLUNTEER,
        UserGroup.MAIN_VOLUNTEER,
    ])
    const assigneeLogin = application.assignee?.trim() || ""
    const assigneeName = assigneeUser?.fullName || assigneeLogin
    const recipients = useMemo(
        () => (assigneeLogin ? [{ username: assigneeLogin, name: assigneeName }] : []),
        [assigneeLogin, assigneeName]
    )

    if (!canAsk || recipients.length === 0) return null

    const label = intl.formatMessage({ id: "pages.applications.menu.ask-assignee" })
    const subject = intl.formatMessage(
        { id: "pages.applications.menu.ask-subject" },
        { name: application.name || application.email || application.id }
    )
    const body = intl.formatMessage(
        { id: "pages.applications.menu.ask-body" },
        {
            name: application.name || "—",
            email: application.email || "—",
            link: `/application/${application.id}`,
        }
    )

    return (
        <>
            <InboxNotifyModal
                opened={opened}
                close={() => setOpened(false)}
                recipients={recipients}
                initialSubject={subject}
                initialBody={body}
            />
            {variant === "button" ? (
                <Button
                    variant="light"
                    color="teal"
                    size="compact-sm"
                    leftSection={<IconMessageCircle size={16} />}
                    onClick={() => setOpened(true)}
                >
                    <FormattedMessage id="pages.applications.menu.ask-assignee" />
                </Button>
            ) : (
                <Tooltip label={label} withArrow>
                    <ActionIcon
                        variant="subtle"
                        color="teal"
                        size={28}
                        aria-label={label}
                        onClick={() => setOpened(true)}
                    >
                        <IconMessageCircle size={16} />
                    </ActionIcon>
                </Tooltip>
            )}
        </>
    )
}
