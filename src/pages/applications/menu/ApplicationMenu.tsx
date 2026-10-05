import { ActionIcon, Menu } from "@mantine/core"
import { ApplicationDto, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconDotsVertical, IconEye, IconMail, IconMessageCircle } from "@tabler/icons-react"
import { useContext, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { applicationTemplates } from "src/shared/email/templates"
import { EmailDrawer } from "src/shared/ui/emailModal/EmailDrawer"
import { InboxNotifyModal } from "src/shared/ui/inbox/InboxNotifyModal"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { locales } from "./lib/locales"

interface ApplicationMenuProps {
    applicationDto: ApplicationDto
    assigneeUser?: UserInfoDto
}

export const ApplicationMenu = ({ applicationDto, assigneeUser }: ApplicationMenuProps) => {
    const intl = useIntl()
    const { user } = useContext(UserContext)
    const [emailDrawerOpen, setEmailDrawerOpen] = useState(false)
    const [askOpen, setAskOpen] = useState(false)
    const navigate = useNavigate()

    const canAskAssignee = hasPermission(user, [
        UserGroup.ADMIN,
        UserGroup.ADMIN_SSO,
        UserGroup.ADMIN_VOLUNTEER,
        UserGroup.MAIN_VOLUNTEER,
    ])
    const assigneeLogin = applicationDto.assignee?.trim() || ""
    const assigneeName = assigneeUser?.fullName || assigneeLogin
    const askRecipients = useMemo(
        () => (assigneeLogin ? [{ username: assigneeLogin, name: assigneeName }] : []),
        [assigneeLogin, assigneeName]
    )

    const askSubject = intl.formatMessage(
        { id: locales.askSubject },
        { name: applicationDto.name || applicationDto.email || applicationDto.id }
    )
    const askBody = intl.formatMessage(
        { id: locales.askBody },
        {
            name: applicationDto.name || "—",
            email: applicationDto.email || "—",
            link: `/application/${applicationDto.id}`,
        }
    )

    return (
        <Menu shadow="md" width={240} closeOnItemClick={false}>
            <EmailDrawer
                opened={emailDrawerOpen}
                from={"Русская Диаспора <apply@russian.rs>"}
                close={() => setEmailDrawerOpen(false)}
                recipients={[{ name: applicationDto.name!!, email: applicationDto.email!! }]}
                templates={applicationTemplates}
            />
            {canAskAssignee && askRecipients.length > 0 && (
                <InboxNotifyModal
                    opened={askOpen}
                    close={() => setAskOpen(false)}
                    recipients={askRecipients}
                    initialSubject={askSubject}
                    initialBody={askBody}
                />
            )}

            <Menu.Target>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={24}
                    aria-label={intl.formatMessage({
                        id: "pages.applications.menu.actions",
                        defaultMessage: "Действия с заявкой",
                    })}
                >
                    <IconDotsVertical size={16} aria-hidden="true" />
                </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Item
                    leftSection={<IconEye size={14} />}
                    onClick={() => navigate(`/application/${applicationDto.id}`)}
                >
                    <FormattedMessage id={locales.view} />
                </Menu.Item>
                <Menu.Item leftSection={<IconMail size={14} />} onClick={() => setEmailDrawerOpen(true)}>
                    <FormattedMessage id={locales.contact} />
                </Menu.Item>
                {canAskAssignee && askRecipients.length > 0 && (
                    <Menu.Item
                        leftSection={<IconMessageCircle size={14} />}
                        onClick={() => {
                            setAskOpen(true)
                        }}
                    >
                        <FormattedMessage id={locales.askAssignee} />
                    </Menu.Item>
                )}
            </Menu.Dropdown>
        </Menu>
    )
}
