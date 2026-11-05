import { Alert, Card, Flex, Loader, Text, Title } from "@mantine/core"
import { IconChevronRight, IconFileAnalytics, IconUser } from "@tabler/icons-react"
import React, { useContext, useMemo, useState } from "react"
import { FormattedMessage } from "react-intl"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { UserContext } from "src/app/providers/UserContext"
import { ReportsExporter } from "src/pages/reportsPersonal/reportsExporter/ReportsExporter"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { hasPermission } from "src/shared/user/roles"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { UserApiService } from "src/shared/api/user/UserApiService"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import { MembershipPotvrdaCard } from "src/pages/documents/MembershipPotvrdaCard"
import { OfficialPotvrdaCard } from "src/pages/documents/OfficialPotvrdaCard"
import { PotvrdaRegistryPanel } from "src/pages/documents/PotvrdaRegistryPanel"
import classes from "./DocumentsPage.module.scss"

const STAFF_FOR_OTHERS = ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO", "MAIN_VOLUNTEER"]
const ZAHVALNICA_ROLES = ["ADMIN", "ADMIN_VOLUNTEER", "ADMIN_SSO", "MAIN_VOLUNTEER"]

const DocumentsPage: React.FC = () => {
    const { user: currentUser } = useContext(UserContext)
    const [subject, setSubject] = useState<UserInfoDto | null>(null)

    setDocumentTitleByLocale("pages.documents.title")

    const canPickUser = hasPermission(currentUser, STAFF_FOR_OTHERS)
    const subjectUsername = subject?.username ?? null

    const { data: resolvedSubject, isFetching: resolvingSubject } = useQuery({
        queryKey: ["documents-subject-user", subjectUsername],
        queryFn: async () => {
            const response = await UserApiService.resolveUsers([subjectUsername!])
            return (
                response.data.find((user) => user.username === subjectUsername) ??
                response.data[0] ??
                null
            )
        },
        enabled: !!subjectUsername,
        staleTime: 60_000,
    })

    const targetUser = subjectUsername ? resolvedSubject ?? subject : currentUser
    const volunteerPickRequired = canPickUser && !subjectUsername

    const showZahvalnica = useMemo(
        () => hasPermission(currentUser, ZAHVALNICA_ROLES),
        [currentUser]
    )

    if (!targetUser) {
        return null
    }

    return (
        <Flex direction="column" className={classes.root} gap="lg">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.documents.title" />
                </Title>
                <Text c="dimmed" mt={4}>
                    <FormattedMessage id="pages.documents.subtitle" />
                </Text>
            </div>

            {canPickUser && (
                <>
                    <UserSearch
                        label={<FormattedMessage id="pages.documents.subjectLabel" />}
                        description={<FormattedMessage id="pages.documents.subjectHint" />}
                        onUserChange={setSubject}
                    />
                    {volunteerPickRequired && (
                        <Alert color="blue" variant="light" icon={<IconUser size={18} />}>
                            <FormattedMessage id="pages.documents.subjectPickRequired" />
                        </Alert>
                    )}
                    {subjectUsername && (
                        <Alert
                            color="teal"
                            variant="light"
                            icon={resolvingSubject ? <Loader size={16} /> : <IconUser size={18} />}
                        >
                            <FormattedMessage
                                id="pages.documents.subjectActive"
                                values={{
                                    name: targetUser?.fullName ?? subject?.fullName ?? subjectUsername,
                                }}
                            />
                        </Alert>
                    )}
                </>
            )}

            <div className={classes.grid}>
                {canPickUser && (
                    <OfficialPotvrdaCard
                        key={targetUser?.username ?? "official"}
                        user={targetUser!}
                        volunteerPickRequired={volunteerPickRequired}
                    />
                )}
                <MembershipPotvrdaCard
                    key={targetUser?.username ?? "membership"}
                    user={targetUser!}
                    volunteerPickRequired={canPickUser && volunteerPickRequired}
                />

                <Card withBorder radius="md" padding="lg" className={classes.card}>
                    <Flex align="flex-start" gap="sm">
                        <IconFileAnalytics size={28} stroke={1.4} />
                        <div>
                            <Text fw={600} size="lg">
                                <FormattedMessage id="pages.documents.hours.title" />
                            </Text>
                            <Text size="sm" c="dimmed" mt={4}>
                                <FormattedMessage id="pages.documents.hours.description" />
                            </Text>
                        </div>
                    </Flex>
                    <Flex className={classes.cardActions} gap="sm" wrap="wrap" align="center">
                        {targetUser.username === currentUser?.username ? (
                            <ReportsExporter />
                        ) : (
                            <Text size="sm" c="dimmed">
                                <FormattedMessage id="pages.documents.hours.selfOnly" />
                            </Text>
                        )}
                        <Link to="/reports/personal" style={{ textDecoration: "none" }}>
                            <Flex align="center" gap={4} component="span">
                                <Text size="sm">
                                    <FormattedMessage id="pages.documents.hours.link" />
                                </Text>
                                <IconChevronRight size={16} />
                            </Flex>
                        </Link>
                    </Flex>
                </Card>

                {showZahvalnica && (
                    <Card withBorder radius="md" padding="lg" className={classes.card}>
                        <Text fw={600} size="lg">
                            <FormattedMessage id="navbar.zahvalnica" />
                        </Text>
                        <Text size="sm" c="dimmed" mt={4}>
                            <FormattedMessage id="pages.documents.zahvalnica.description" />
                        </Text>
                        <Flex className={classes.cardActions}>
                            <Link to="/zahvalnica">
                                <Flex align="center" gap={4}>
                                    <FormattedMessage id="pages.documents.zahvalnica.open" />
                                    <IconChevronRight size={16} />
                                </Flex>
                            </Link>
                        </Flex>
                    </Card>
                )}
            </div>

            {canPickUser && <PotvrdaRegistryPanel />}
        </Flex>
    )
}

export default DocumentsPage
