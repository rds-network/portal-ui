import { Badge, Button, Flex, Loader, Text, Textarea, Title } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { IconBeach } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import {
    LeaveRequestApiService,
    LeaveRequestDto,
    LeaveRequestStatus,
} from "src/shared/api/LeaveRequestApiService"
import { ProgramCuratorApiService } from "src/shared/api/ProgramCuratorApiService"
import { ReportHeatMapApiService } from "src/shared/api/ReportHeatMapApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./LeavePage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.ADMIN_SSO, UserGroup.MAIN_VOLUNTEER]

const STATUS_COLOR: Record<LeaveRequestStatus, string> = {
    PENDING: "yellow",
    ACCEPTED: "green",
    REJECTED: "red",
    CANCELLED: "gray",
}

const formatPeriod = (start: string, end: string) =>
    `${dayjs(start).format("DD.MM.YYYY")} — ${dayjs(end).format("DD.MM.YYYY")}`

export const LeavePage: React.FC = () => {
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const queryClient = useQueryClient()
    const [rejectId, setRejectId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState("")

    setDocumentTitleByLocale("pages.leave.title")

    const { data: curatorMe } = useQuery({
        queryKey: ["program-curators", "me"],
        queryFn: () => ProgramCuratorApiService.me(),
        enabled: !!user,
    })
    const canDecide = !!curatorMe?.curator || hasPermission(user, MANAGERS)

    const form = useForm({
        initialValues: {
            startDate: null as Date | null,
            endDate: null as Date | null,
            reason: "",
        },
        validate: {
            startDate: (value) => (!value ? intl.formatMessage({ id: "pages.leave.requiredDates" }) : null),
            endDate: (value, values) => {
                if (!value) return intl.formatMessage({ id: "pages.leave.requiredDates" })
                if (values.startDate && dayjs(value).isBefore(dayjs(values.startDate), "day")) {
                    return intl.formatMessage({ id: "pages.leave.endBeforeStart" })
                }
                return null
            },
        },
    })

    const { data: mine = [], isLoading: mineLoading } = useQuery({
        queryKey: ["leave-requests", "mine"],
        queryFn: () => LeaveRequestApiService.mine(),
    })

    const { data: pending = [], isLoading: pendingLoading } = useQuery({
        queryKey: ["leave-requests", "pending"],
        queryFn: () => LeaveRequestApiService.pending(),
        enabled: canDecide,
    })

    const { data: heatmapByYear } = useQuery({
        queryKey: ["currentUserHeatmap", "leave-surplus"],
        queryFn: () => ReportHeatMapApiService.getCurrentUserHeatMap().then((response) => response.data),
        staleTime: 5 * 60 * 1000,
    })

    const overtimeSurplus = useMemo(() => {
        const yearKey = String(dayjs().year())
        const heatmap = heatmapByYear?.[yearKey]
        if (!heatmap) return null
        const worked = heatmap.totalWorked ?? 0
        const required = heatmap.totalRequired ?? 0
        const delta = Math.round((worked - required) * 10) / 10
        return delta > 0 ? delta : null
    }, [heatmapByYear])

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["leave-requests"] })
    }

    const { mutate: create, isPending: creating } = useMutation({
        mutationFn: () =>
            LeaveRequestApiService.create({
                startDate: dayjs(form.values.startDate).format("YYYY-MM-DD"),
                endDate: dayjs(form.values.endDate).format("YYYY-MM-DD"),
                reason: form.values.reason.trim() || null,
            }),
        onSuccess: () => {
            form.reset()
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.leave.created" />
                    </Text>,
                    null
                )
            )
        },
    })

    const { mutate: accept, isPending: accepting } = useMutation({
        mutationFn: (id: string) => LeaveRequestApiService.accept(id),
        onSuccess: () => {
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.leave.accepted" />
                    </Text>,
                    null
                )
            )
        },
    })

    const { mutate: reject, isPending: rejecting } = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
            LeaveRequestApiService.reject(id, reason ? { reason } : undefined),
        onSuccess: () => {
            setRejectId(null)
            setRejectReason("")
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.leave.rejected" />
                    </Text>,
                    null
                )
            )
        },
    })

    const renderItem = (item: LeaveRequestDto, decide = false) => (
        <div className={classes.row} key={item.id}>
            <div className={classes.meta}>
                {decide && (
                    <Text fw={600} size="sm">
                        {item.fullName || item.username}
                        {item.programCode ? ` · ${item.programCode}` : ""}
                    </Text>
                )}
                <Text size="sm">{formatPeriod(item.startDate, item.endDate)}</Text>
                {item.reason && (
                    <Text size="xs" className={classes.hint}>
                        {item.reason}
                    </Text>
                )}
                <Text size="xs" className={classes.hint}>
                    {dayjs(item.createdAt).format("DD.MM.YYYY HH:mm")}
                </Text>
            </div>
            <div className={classes.actions}>
                <Badge color={STATUS_COLOR[item.status] || "gray"} variant="light">
                    <FormattedMessage id={`pages.leave.status.${item.status}`} />
                </Badge>
                {decide && item.status === "PENDING" && (
                    <>
                        <Button size="xs" color="green" loading={accepting} onClick={() => accept(item.id)}>
                            <FormattedMessage id="pages.leave.accept" />
                        </Button>
                        {rejectId === item.id ? (
                            <Flex gap={8} align="flex-end" wrap="wrap">
                                <Textarea
                                    size="xs"
                                    minRows={1}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.currentTarget.value)}
                                    placeholder={intl.formatMessage({ id: "pages.leave.rejectReason" })}
                                    style={{ minWidth: 180 }}
                                />
                                <Button
                                    size="xs"
                                    color="red"
                                    loading={rejecting}
                                    onClick={() => reject({ id: item.id, reason: rejectReason.trim() || undefined })}
                                >
                                    <FormattedMessage id="pages.leave.rejectConfirm" />
                                </Button>
                                <Button size="xs" variant="default" onClick={() => setRejectId(null)}>
                                    <FormattedMessage id="pages.leave.cancel" />
                                </Button>
                            </Flex>
                        ) : (
                            <Button size="xs" color="red" variant="light" onClick={() => setRejectId(item.id)}>
                                <FormattedMessage id="pages.leave.reject" />
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    )

    return (
        <div className={classes.root}>
            <Flex align="center" gap={10}>
                <IconBeach size={28} stroke={1.5} />
                <div>
                    <Title order={2}>
                        <FormattedMessage id="pages.leave.title" />
                    </Title>
                    <Text size="sm" className={classes.hint}>
                        <FormattedMessage id="pages.leave.description" />
                    </Text>
                </div>
            </Flex>

            <div className={classes.section}>
                <Title order={4}>
                    <FormattedMessage id="pages.leave.requestTitle" />
                </Title>
                {overtimeSurplus != null && (
                    <Text size="sm" className={classes.hint}>
                        <FormattedMessage id="pages.leave.overtimeHint" values={{ hours: overtimeSurplus }} />
                    </Text>
                )}
                <form
                    onSubmit={form.onSubmit(() => create())}
                    style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                    <div className={classes.formGrid}>
                        <DateInput
                            label={<FormattedMessage id="pages.leave.startDate" />}
                            valueFormat="DD.MM.YYYY"
                            {...form.getInputProps("startDate")}
                        />
                        <DateInput
                            label={<FormattedMessage id="pages.leave.endDate" />}
                            valueFormat="DD.MM.YYYY"
                            {...form.getInputProps("endDate")}
                        />
                    </div>
                    <Textarea
                        label={<FormattedMessage id="pages.leave.reason" />}
                        minRows={2}
                        {...form.getInputProps("reason")}
                    />
                    <Button type="submit" loading={creating} w="fit-content">
                        <FormattedMessage id="pages.leave.submit" />
                    </Button>
                </form>
            </div>

            {canDecide && (
                <div className={classes.section}>
                    <Title order={4}>
                        <FormattedMessage id="pages.leave.pendingTitle" />
                    </Title>
                    {pendingLoading ? (
                        <Loader size="sm" />
                    ) : pending.length === 0 ? (
                        <Text size="sm" className={classes.hint}>
                            <FormattedMessage id="pages.leave.pendingEmpty" />
                        </Text>
                    ) : (
                        pending.map((item) => renderItem(item, true))
                    )}
                </div>
            )}

            <div className={classes.section}>
                <Title order={4}>
                    <FormattedMessage id="pages.leave.mineTitle" />
                </Title>
                {mineLoading ? (
                    <Loader size="sm" />
                ) : mine.length === 0 ? (
                    <Text size="sm" className={classes.hint}>
                        <FormattedMessage id="pages.leave.mineEmpty" />
                    </Text>
                ) : (
                    mine.map((item) => renderItem(item))
                )}
            </div>
        </div>
    )
}

export default LeavePage
