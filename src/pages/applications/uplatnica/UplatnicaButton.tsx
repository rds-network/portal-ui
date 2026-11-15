import { Button } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { ApplicationDto } from "@rds-network/portal-api-axios"
import { IconReceipt } from "@tabler/icons-react"
import { FormattedMessage } from "react-intl"
import { ApplicationMailDrawer } from "src/pages/applications/mail/ApplicationMailDrawer"

interface UplatnicaButtonProps {
    application: ApplicationDto
    className?: string
}

export const UplatnicaButton = ({ application, className }: UplatnicaButtonProps) => {
    const [opened, { open, close }] = useDisclosure(false)

    return (
        <>
            <Button
                variant="light"
                className={className}
                rightSection={<IconReceipt size={15} />}
                disabled={!application.email || !application.name || !application.city}
                onClick={open}
            >
                <FormattedMessage id="pages.applications.view.uplatnica" />
            </Button>
            <ApplicationMailDrawer opened={opened} close={close} application={application} slip />
        </>
    )
}
