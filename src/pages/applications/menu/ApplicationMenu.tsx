import { ActionIcon, Menu } from "@mantine/core"
import { ApplicationDto } from "@rds-network/portal-api-axios"
import { IconDotsVertical, IconEye, IconMail } from "@tabler/icons-react"
import { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { applicationTemplates } from "src/shared/email/templates"
import { EmailDrawer } from "src/shared/ui/emailModal/EmailDrawer"
import { locales } from "./lib/locales"

interface ApplicationMenuProps {
    applicationDto: ApplicationDto
}

export const ApplicationMenu = (props: ApplicationMenuProps) => {
    const intl = useIntl()
    const [emailDrawerOpen, setEmailDrawerOpen] = useState<boolean>(false)
    const navigate = useNavigate()

    return (
        <Menu shadow="md" width={200} closeOnItemClick={false}>
            <EmailDrawer
                opened={emailDrawerOpen}
                from={"Русская Диаспора <apply@russian.rs>"}
                close={() => setEmailDrawerOpen(false)}
                recipients={[{ name: props.applicationDto.name!!, email: props.applicationDto.email!! }]}
                templates={applicationTemplates}
            />

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
                    onClick={() => navigate(`/application/${props.applicationDto.id}`)}
                >
                    <FormattedMessage id={locales.view} />
                </Menu.Item>
                <Menu.Item leftSection={<IconMail size={14} />} onClick={() => setEmailDrawerOpen(true)}>
                    <FormattedMessage id={locales.contact} />
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    )
}
