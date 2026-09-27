import { Badge, Button, Card, Flex, Loader, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import { IconMap, IconShieldOff, IconUser } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useContext, useEffect } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import {
    reportControllerNameOf,
    UserAccountApiService,
} from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./ControlledVolunteersPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_SSO, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]

export const ControlledVolunteersPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    setDocumentTitleByLocale("pages.controlled.title")

    const isManager = hasPermission(user, MANAGERS)
    const { data: curatorMe, isFetched: curatorFetched } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!user && !isManager,
    })

    const allowed = isManager || !!curatorMe?.curator

    useEffect(() => {
        if (!user || isManager) return
        if (!curatorFetched) return
        if (!allowed) navigate("/unauthorized", { replace: true })
    }, [user, isManager, curatorFetched, allowed, navigate])

    const { data: items = [], isLoading, isFetching } = useQuery({
        queryKey: ["controlled-by-me"],
        queryFn: () => UserAccountApiService.controlledByMe(),
        enabled: allowed,
    })

    const { mutate: clearControl, isPending: isClearing } = useMutation({
        mutationFn: (id: number) => UserAccountApiService.clearReportController(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["controlled-by-me"] })
            queryClient.invalidateQueries({ queryKey: ["searchUsers"] })
            queryClient.invalidateQueries({ queryKey: ["getInfo"] })
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.profileUpdated" />
                    </Text>,
                    null
                )
            )
        },
    })

    return (
        <Flex direction="column" gap="md" className={classes.page}>
            <Flex align="center" justify="space-between" wrap="wrap" gap="sm">
                <div>
                    <Title order={2}>
                        <FormattedMessage id="pages.controlled.title" />
                    </Title>
                    <Text size="sm" c="dimmed">
                        <FormattedMessage id="pages.controlled.subtitle" />
                    </Text>
                </div>
                {(isLoading || isFetching) && <Loader size="sm" />}
            </Flex>

            {!isLoading && items.length === 0 && (
                <Text c="dimmed">
                    <FormattedMessage id="pages.controlled.empty" />
                </Text>
            )}

            <Flex direction="column" gap="sm">
                {items.map((item: UserInfoDto) => (
                    <Card key={item.id} withBorder padding="md" radius="md" className={classes.card}>
                        <Flex justify="space-between" align="flex-start" gap="md" wrap="wrap">
                            <div>
                                <Text fw={600}>{item.fullName}</Text>
                                <Text size="sm" c="dimmed">
                                    {item.username}
                                    {item.program?.code ? ` · ${item.program.code}` : ""}
                                </Text>
                                {!!reportControllerNameOf(item) && (
                                    <Badge color="teal" radius="md" variant="light" mt={6}>
                                        <FormattedMessage
                                            id="pages.user-list.report-controller-badge"
                                            values={{ name: reportControllerNameOf(item) }}
                                        />
                                    </Badge>
                                )}
                            </div>
                            <Flex gap="xs" wrap="wrap">
                                <Button
                                    size="compact-sm"
                                    variant="light"
                                    leftSection={<IconUser size={14} />}
                                    onClick={() => navigate(`/profile/${item.username}`)}
                                >
                                    <FormattedMessage id="pages.controlled.openProfile" />
                                </Button>
                                <Button
                                    size="compact-sm"
                                    variant="light"
                                    leftSection={<IconMap size={14} />}
                                    onClick={() =>
                                        navigate(
                                            `/volunteers/heatmap?search=${encodeURIComponent(item.username)}`
                                        )
                                    }
                                >
                                    <FormattedMessage id="pages.controlled.openHeatmap" />
                                </Button>
                                <Button
                                    size="compact-sm"
                                    variant="subtle"
                                    color="red"
                                    leftSection={<IconShieldOff size={14} />}
                                    loading={isClearing}
                                    onClick={() => clearControl(item.id)}
                                >
                                    <FormattedMessage id="pages.profile.reportControlClear" />
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                ))}
            </Flex>
        </Flex>
    )
}

export default ControlledVolunteersPage
