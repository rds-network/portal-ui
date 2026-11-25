import { Button, Card, Text } from "@mantine/core"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import { IconChevronRight, IconFileX } from "@tabler/icons-react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link } from "react-router"
import classes from "./DocumentsPage.module.scss"

interface TerminationPotvrdaCardProps {
    user: UserInfoDto
    volunteerPickRequired?: boolean
}

export const TerminationPotvrdaCard = ({ user, volunteerPickRequired = false }: TerminationPotvrdaCardProps) => {
    const intl = useIntl()
    const editorTo = user.username
        ? `/documents/termination-potvrda?username=${encodeURIComponent(user.username)}`
        : "/documents/termination-potvrda"

    return (
        <Card withBorder radius="md" padding="lg" className={classes.card}>
            <Text fw={600} size="lg">
                <FormattedMessage id="pages.documents.termination.title" />
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
                <FormattedMessage id="pages.documents.termination.description" />
            </Text>
            <Button
                mt="md"
                component={Link}
                to={editorTo}
                leftSection={<IconFileX size={18} />}
                rightSection={<IconChevronRight size={16} />}
                disabled={!user.username || volunteerPickRequired}
                title={
                    volunteerPickRequired
                        ? intl.formatMessage({ id: "pages.documents.subjectPickRequired" })
                        : undefined
                }
            >
                <FormattedMessage id="pages.documents.official.openEditor" />
            </Button>
        </Card>
    )
}
