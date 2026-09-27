import { Badge, Button, Flex, Loader, Text, Textarea, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconUserCheck } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import {
    AccountStatusApiService,
    AccountStatusEventDto,
    AccountStatusRequestDto,
} from "src/shared/api/AccountStatusApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./AccountStatusPage.module.scss"

const MANAGERS = [UserGroup.ADMIN_VOLUNTEER, UserGroup.ADMIN_SSO]

const STATUS_COLOR: Record<string, string> = {
    PENDING: "yellow",
    APPROVED: "green",
    REJECTED: "red",
}

export const AccountStatusPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [rejectId, setRejectId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState("")

    setDocumentTitleByLocale("pages.account-status.title")

    const { data: meta } = useQuery({
        queryKey: ["account-status-meta"],
        queryFn: () => AccountStatusApiService.meta(),
        enabled: !!user,
    })

    const canAccess = !!meta?.isAccountStatusApprover || hasPermission(user, MANAGERS)

    useEffect(() => {
        if (user && meta && !canAccess) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, meta, canAccess, navigate])

    const { data: pending = [], isLoading: pendingLoading } = useQuery({
        queryKey: ["account-status", "pending"],
        queryFn: () => AccountStatusApiService.pending(),
        enabled: canAccess,
    })

    const { data: events = [], isLoading: eventsLoading } = useQuery({
        queryKey: ["account-status", "events"],
        queryFn: () => AccountStatusApiService.events(),
        enabled: canAccess,
    })

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["account-status"] })
        queryClient.invalidateQueries({ queryKey: ["inbox"] })
    }

    const { mutate: approve, isPending: approving } = useMutation({
        mutationFn: (id: string) => AccountStatusApiService.approve(id),
        onSuccess: () => {
            refresh()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.account-status.approved" />
                    </Text>,
                    null
                )
            )
        },
    })

    const { mutate: reject, isPending: rejecting } = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
            AccountStatusApiService.reject(id, reason ? { reason } : undefined),
        onSuccess: () => {
            setRejectId(null)
            setRejectReason("")
            refresh()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.account-status.rejected" />
                    </Text>,
                    null
                )
            )
        },
    })

    const canDecide = !!meta?.isAccountStatusApprover

    const renderRequest = (item: AccountStatusRequestDto, decide = false) => (
        <div key={item.id} className={classes.row}>
            <div className={classes.meta}>
                <Text fw={600}>
                    {item.targetFullName || item.targetUsername}{" "}
                    <Text span c="dimmed" fw={400}>
                        ({item.targetUsername})
                    </Text>
                </Text>
                <Text size="sm" c="dimmed">
                    <FormattedMessage
                        id={item.requestedActive ? "pages.account-status.activate" : "pages.account-status.deactivate"}
                    />
                    {" · "}
                    <FormattedMessage id="pages.account-status.requestedBy" values={{ name: item.createdBy }} />
                    {" · "}
                    {dayjs(item.createdAt).format("DD.MM.YYYY HH:mm")}
                </Text>
                {item.reason && (
                    <Text size="sm">
                        <FormattedMessage id="pages.account-status.reason" />: {item.reason}
                    </Text>
                )}
                {item.decidedBy && (
                    <Text size="sm" c="dimmed">
                        <FormattedMessage
                            id="pages.account-status.decidedBy"
                            values={{
                                date: item.decidedAt ? dayjs(item.decidedAt).format("DD.MM.YYYY HH:mm") : "—",
                                name: item.decidedBy,
                            }}
                        />
                    </Text>
                )}
            </div>
            <div className={classes.actions}>
                <Badge color={STATUS_COLOR[item.status] || "gray"} variant="light">
                    <FormattedMessage id={`pages.account-status.status.${item.status}`} />
                </Badge>
                {decide && canDecide && (
                    <>
                        <Button size="compact-sm" onClick={() => approve(item.id)} loading={approving}>
                            <FormattedMessage id="pages.account-status.accept" />
                        </Button>
                        {rejectId === item.id ? (
                            <Flex gap={6} align="center" wrap="wrap">
                                <Textarea
                                    size="xs"
                                    minRows={1}
                                    autosize
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.currentTarget.value)}
                                    placeholder={intl.formatMessage({ id: "pages.account-status.rejectReason" })}
                                />
                                <Button
                                    size="compact-sm"
                                    color="red"
                                    loading={rejecting}
                                    onClick={() => reject({ id: item.id, reason: rejectReason.trim() || undefined })}
                                >
                                    <FormattedMessage id="pages.account-status.rejectConfirm" />
                                </Button>
                                <Button
                                    size="compact-sm"
                                    variant="subtle"
                                    onClick={() => {
                                        setRejectId(null)
                                        setRejectReason("")
                                    }}
                                >
                                    <FormattedMessage id="pages.account-status.cancel" />
                                </Button>
                            </Flex>
                        ) : (
                            <Button size="compact-sm" color="red" variant="light" onClick={() => setRejectId(item.id)}>
                                <FormattedMessage id="pages.account-status.reject" />
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    )

    const renderEvent = (item: AccountStatusEventDto) => (
        <div key={item.id} className={classes.row}>
            <div className={classes.meta}>
                <Text fw={600}>
                    {item.accountFullName || item.accountUsername}{" "}
                    <Text span c="dimmed" fw={400}>
                        ({item.accountUsername})
                    </Text>
                </Text>
                <Text size="sm" c="dimmed">
                    <FormattedMessage
                        id={item.activeTo ? "pages.account-status.becameActive" : "pages.account-status.becameInactive"}
                    />
                    {" · "}
                    <FormattedMessage id={`pages.account-status.source.${item.source}`} />
                    {item.actorUsername ? ` · ${item.actorUsername}` : ""}
                    {" · "}
                    {dayjs(item.createdAt).format("DD.MM.YYYY HH:mm")}
                </Text>
                {item.reason && (
                    <Text size="sm">
                        <FormattedMessage id="pages.account-status.reason" />: {item.reason}
                    </Text>
                )}
            </div>
        </div>
    )

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <div>
                <Flex align="center" gap="sm">
                    <IconUserCheck size={28} />
                    <Title order={2}>
                        <FormattedMessage id="pages.account-status.title" />
                    </Title>
                </Flex>
                <Text c="dimmed" mt={6}>
                    <FormattedMessage id="pages.account-status.description" />
                </Text>
            </div>

            <div className={classes.section}>
                <Title order={4}>
                    <FormattedMessage id="pages.account-status.pendingTitle" />
                </Title>
                {pendingLoading ? (
                    <Loader size="sm" />
                ) : pending.length === 0 ? (
                    <Text c="dimmed">
                        <FormattedMessage id="pages.account-status.pendingEmpty" />
                    </Text>
                ) : (
                    pending.map((item) => renderRequest(item, true))
                )}
            </div>

            <div className={classes.section}>
                <Title order={4}>
                    <FormattedMessage id="pages.account-status.historyTitle" />
                </Title>
                <Text size="sm" c="dimmed" mb="xs">
                    <FormattedMessage id="pages.account-status.historyDescription" />
                </Text>
                {eventsLoading ? (
                    <Loader size="sm" />
                ) : events.length === 0 ? (
                    <Text c="dimmed">
                        <FormattedMessage id="pages.account-status.historyEmpty" />
                    </Text>
                ) : (
                    events.map(renderEvent)
                )}
            </div>
        </Flex>
    )
}

export default AccountStatusPage
