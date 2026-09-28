import { Badge, Button, Flex, Loader, Text, Textarea, Title } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { IconFileOff } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import {
    DissolutionRequestApiService,
    DissolutionRequestDto,
    DissolutionRequestStatus,
} from "src/shared/api/DissolutionRequestApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import classes from "../leave/LeavePage.module.scss"

const STATUS_COLOR: Record<DissolutionRequestStatus, string> = {
    PENDING: "yellow",
    ACCEPTED: "green",
    REJECTED: "red",
    CANCELLED: "gray",
}

export const DissolutionRequestsPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const queryClient = useQueryClient()
    const [rejectId, setRejectId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState("")

    setDocumentTitleByLocale("pages.dissolutionRequests.title")

    const { data: dissolutionMeta } = useQuery({
        queryKey: ["dissolution-requests", "meta"],
        queryFn: () => DissolutionRequestApiService.meta(),
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    })
    const canDecide = !!dissolutionMeta?.isDissolutionApprover

    const form = useForm({
        initialValues: {
            fromDate: null as Date | null,
            reason: "",
        },
        validate: {
            fromDate: (value) => (!value ? intl.formatMessage({ id: "pages.dissolutionRequests.requiredDate" }) : null),
            reason: (value) =>
                !value.trim() ? intl.formatMessage({ id: "pages.dissolutionRequests.requiredReason" }) : null,
        },
    })

    const { data: mine = [], isLoading: mineLoading } = useQuery({
        queryKey: ["dissolution-requests", "mine"],
        queryFn: () => DissolutionRequestApiService.mine(),
    })

    const { data: pending = [], isLoading: pendingLoading } = useQuery({
        queryKey: ["dissolution-requests", "pending"],
        queryFn: () => DissolutionRequestApiService.pending(),
        enabled: canDecide,
    })

    const { data: history = [], isLoading: historyLoading } = useQuery({
        queryKey: ["dissolution-requests", "history"],
        queryFn: () => DissolutionRequestApiService.history(),
        enabled: canDecide,
    })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["dissolution-requests"] })
        queryClient.invalidateQueries({ queryKey: ["dissolution-queue"] })
    }

    const { mutate: create, isPending: creating } = useMutation({
        mutationFn: () =>
            DissolutionRequestApiService.create({
                fromDate: dayjs(form.values.fromDate).format("YYYY-MM-DD"),
                reason: form.values.reason.trim(),
            }),
        onSuccess: () => {
            form.reset()
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.dissolutionRequests.created" />
                    </Text>,
                    null
                )
            )
        },
    })

    const { mutate: accept, isPending: accepting } = useMutation({
        mutationFn: (id: string) => DissolutionRequestApiService.accept(id),
        onSuccess: () => {
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.dissolutionRequests.accepted" />
                    </Text>,
                    null
                )
            )
        },
    })

    const { mutate: reject, isPending: rejecting } = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
            DissolutionRequestApiService.reject(id, reason ? { reason } : undefined),
        onSuccess: () => {
            setRejectId(null)
            setRejectReason("")
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.dissolutionRequests.rejected" />
                    </Text>,
                    null
                )
            )
        },
    })

    const { mutate: cancel, isPending: cancelling } = useMutation({
        mutationFn: (id: string) => DissolutionRequestApiService.cancel(id),
        onSuccess: () => {
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.dissolutionRequests.cancelled" />
                    </Text>,
                    null
                )
            )
        },
    })

    const renderItem = (item: DissolutionRequestDto, decide = false, withOwner = decide) => (
        <div className={classes.row} key={item.id}>
            <div className={classes.meta}>
                {withOwner && (
                    <Text fw={600} size="sm">
                        {item.fullName || item.username}
                        {item.programCode ? ` · ${item.programCode}` : ""}
                    </Text>
                )}
                <Text size="sm">
                    <FormattedMessage
                        id="pages.dissolutionRequests.fromDateValue"
                        values={{ date: dayjs(item.fromDate).format("DD.MM.YYYY") }}
                    />
                </Text>
                {item.reason && (
                    <Text size="xs" className={classes.hint}>
                        {item.reason}
                    </Text>
                )}
                {item.mupLetterSentAt && (
                    <Badge color="grape" variant="light" size="sm" w="fit-content">
                        <FormattedMessage
                            id="pages.dissolution.mupNotified"
                            values={{ date: dayjs(item.mupLetterSentAt).format("DD.MM.YYYY") }}
                        />
                    </Badge>
                )}
                <Text size="xs" className={classes.hint}>
                    {dayjs(item.createdAt).format("DD.MM.YYYY HH:mm")}
                </Text>
                {item.decidedAt && (
                    <Text size="xs" className={classes.hint}>
                        <FormattedMessage
                            id="pages.dissolutionRequests.decidedBy"
                            values={{
                                date: dayjs(item.decidedAt).format("DD.MM.YYYY"),
                                name: item.decidedBy || "",
                            }}
                        />
                    </Text>
                )}
            </div>
            <div className={classes.actions}>
                <Badge color={STATUS_COLOR[item.status] || "gray"} variant="light">
                    <FormattedMessage id={`pages.dissolutionRequests.status.${item.status}`} />
                </Badge>
                {decide && item.status === "PENDING" && (
                    <>
                        <Button size="xs" color="green" loading={accepting} onClick={() => accept(item.id)}>
                            <FormattedMessage id="pages.dissolutionRequests.accept" />
                        </Button>
                        {rejectId === item.id ? (
                            <Flex gap={8} align="flex-end" wrap="wrap">
                                <Textarea
                                    size="xs"
                                    minRows={1}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.currentTarget.value)}
                                    placeholder={intl.formatMessage({ id: "pages.dissolutionRequests.rejectReason" })}
                                    style={{ minWidth: 180 }}
                                />
                                <Button
                                    size="xs"
                                    color="red"
                                    loading={rejecting}
                                    onClick={() => reject({ id: item.id, reason: rejectReason.trim() || undefined })}
                                >
                                    <FormattedMessage id="pages.dissolutionRequests.rejectConfirm" />
                                </Button>
                                <Button size="xs" variant="default" onClick={() => setRejectId(null)}>
                                    <FormattedMessage id="pages.dissolutionRequests.cancel" />
                                </Button>
                            </Flex>
                        ) : (
                            <Button size="xs" color="red" variant="light" onClick={() => setRejectId(item.id)}>
                                <FormattedMessage id="pages.dissolutionRequests.reject" />
                            </Button>
                        )}
                    </>
                )}
                {!decide && item.status === "PENDING" && item.username === user?.username && (
                    <Button size="xs" variant="light" loading={cancelling} onClick={() => cancel(item.id)}>
                        <FormattedMessage id="pages.dissolutionRequests.cancelRequest" />
                    </Button>
                )}
            </div>
        </div>
    )

    return (
        <div className={classes.root}>
            <Flex align="center" gap={10}>
                <IconFileOff size={28} stroke={1.5} />
                <div>
                    <Title order={2}>
                        <FormattedMessage id="pages.dissolutionRequests.title" />
                    </Title>
                    <Text size="sm" className={classes.hint}>
                        <FormattedMessage id="pages.dissolutionRequests.description" />
                    </Text>
                </div>
            </Flex>

            <div className={classes.section}>
                <Title order={4}>
                    <FormattedMessage id="pages.dissolutionRequests.requestTitle" />
                </Title>
                <form
                    onSubmit={form.onSubmit(() => create())}
                    style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                    <DateInput
                        label={<FormattedMessage id="pages.dissolutionRequests.fromDate" />}
                        valueFormat="DD.MM.YYYY"
                        {...form.getInputProps("fromDate")}
                    />
                    <Textarea
                        label={<FormattedMessage id="pages.dissolutionRequests.reason" />}
                        minRows={2}
                        {...form.getInputProps("reason")}
                    />
                    <Button type="submit" loading={creating} w="fit-content">
                        <FormattedMessage id="pages.dissolutionRequests.submit" />
                    </Button>
                </form>
            </div>

            {canDecide && (
                <div className={classes.section}>
                    <Title order={4}>
                        <FormattedMessage id="pages.dissolutionRequests.pendingTitle" />
                    </Title>
                    {pendingLoading ? (
                        <Loader size="sm" />
                    ) : pending.length === 0 ? (
                        <Text size="sm" className={classes.hint}>
                            <FormattedMessage id="pages.dissolutionRequests.pendingEmpty" />
                        </Text>
                    ) : (
                        pending.map((item) => renderItem(item, true))
                    )}
                </div>
            )}

            {canDecide && (
                <div className={classes.section}>
                    <Title order={4}>
                        <FormattedMessage id="pages.dissolutionRequests.historyTitle" />
                    </Title>
                    {historyLoading ? (
                        <Loader size="sm" />
                    ) : history.length === 0 ? (
                        <Text size="sm" className={classes.hint}>
                            <FormattedMessage id="pages.dissolutionRequests.historyEmpty" />
                        </Text>
                    ) : (
                        history.map((item) => renderItem(item, false, true))
                    )}
                </div>
            )}

            <div className={classes.section}>
                <Title order={4}>
                    <FormattedMessage id="pages.dissolutionRequests.mineTitle" />
                </Title>
                {mineLoading ? (
                    <Loader size="sm" />
                ) : mine.length === 0 ? (
                    <Text size="sm" className={classes.hint}>
                        <FormattedMessage id="pages.dissolutionRequests.mineEmpty" />
                    </Text>
                ) : (
                    mine.map((item) => renderItem(item))
                )}
            </div>
        </div>
    )
}

export default DissolutionRequestsPage
