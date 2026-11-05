import {
    Anchor,
    Button,
    Checkbox,
    Flex,
    Loader,
    NumberInput,
    ScrollArea,
    Text,
    Textarea,
    TextInput,
} from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { ApplicationDto } from "@rds-network/portal-api-axios"
import { IconMailForward } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link } from "react-router"
import staleFollowUpBody from "src/assets/email_templates/stale_application_follow_up.js"
import {
    ApplicationDtoExtended,
    defaultStaleFollowUpFilter,
} from "src/shared/api/applications/applicationsFilterExtended"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { MailApiService } from "src/shared/api/MailApiService"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { ApplicationStatus } from "src/shared/user/applications"
import classes from "./ApplicationStaleFollowUpPanel.module.scss"

const MAIL_FROM = "Русская Диаспора <apply@russian.rs>"
const DEFAULT_SUBJECT = "Ваша заявка на вступление — Русская Диаспора"

type Props = {
    className?: string
}

export const ApplicationStaleFollowUpPanel = ({ className }: Props) => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const [staleDays, setStaleDays] = useState(14)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [subject, setSubject] = useState(DEFAULT_SUBJECT)
    const [body, setBody] = useState(staleFollowUpBody.replace(/<\/?p>/g, "\n").replace(/<br\/?>/gi, "\n").trim())

    const filter = useMemo(() => defaultStaleFollowUpFilter(staleDays), [staleDays])

    const { data, isFetching, refetch } = useQuery({
        queryKey: ["applications-stale-follow-up", staleDays],
        queryFn: () =>
            PrivateApplicationApiService.getApplications(
                { pageNumber: 0, pageSize: 200, sort: ["created;desc"] },
                "",
                filter as never
            ).then((r) => r.data.content ?? []),
    })

    const applications = (data ?? []) as (ApplicationDto & ApplicationDtoExtended)[]

    const allIds = useMemo(
        () => applications.map((a) => a.id).filter((id): id is string => !!id),
        [applications]
    )

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const selectAll = () => setSelected(new Set(allIds))
    const clearSelection = () => setSelected(new Set())

    const { mutate: sendSelected, isPending: sending } = useMutation({
        mutationFn: async () => {
            const targets = applications.filter((a) => a.id && selected.has(a.id))
            if (targets.length === 0) return 0
            let sent = 0
            for (const app of targets) {
                const email = app.email?.trim()
                if (!email) continue
                const html = body.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("")
                await MailApiService.sendMail(subject, html, MAIL_FROM, email)
                sent += 1
            }
            return sent
        },
        onSuccess: (sent) => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage
                            id="pages.applications.followUp.sent"
                            values={{ count: sent }}
                        />
                    </Text>,
                    null
                )
            )
            clearSelection()
            void queryClient.invalidateQueries({ queryKey: ["applications-stale-follow-up"] })
        },
    })

    return (
        <aside className={`${classes.panel} ${className ?? ""}`}>
            <Text className={classes.title}>
                <FormattedMessage id="pages.applications.followUp.title" />
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
                <FormattedMessage id="pages.applications.followUp.hint" />
            </Text>

            <NumberInput
                size="xs"
                label={<FormattedMessage id="pages.applications.followUp.staleDays" />}
                min={1}
                max={365}
                value={staleDays}
                onChange={(v) => setStaleDays(typeof v === "number" ? v : 14)}
                mb="sm"
            />

            <Flex gap="xs" mb="xs" wrap="wrap">
                <Button size="compact-xs" variant="light" onClick={selectAll} disabled={allIds.length === 0}>
                    <FormattedMessage id="pages.applications.followUp.selectAll" />
                </Button>
                <Button size="compact-xs" variant="subtle" onClick={clearSelection} disabled={selected.size === 0}>
                    <FormattedMessage id="pages.applications.followUp.clear" />
                </Button>
                <Text size="xs" c="dimmed" ms="auto">
                    <FormattedMessage id="pages.applications.followUp.count" values={{ count: applications.length }} />
                </Text>
            </Flex>

            <ScrollArea.Autosize mah={220} mb="sm" className={classes.list}>
                {isFetching && applications.length === 0 ? (
                    <Flex justify="center" py="md">
                        <Loader size="sm" />
                    </Flex>
                ) : applications.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                        <FormattedMessage id="pages.applications.followUp.empty" />
                    </Text>
                ) : (
                    applications.map((app) => {
                        const id = app.id!
                        const status = app.status as ApplicationStatus
                        const updated = app.lastUpdate ? dayjs(app.lastUpdate) : null
                        return (
                            <Flex key={id} gap="xs" className={classes.row} align="flex-start">
                                <Checkbox
                                    checked={selected.has(id)}
                                    onChange={() => toggle(id)}
                                    aria-label={app.name || app.email || id}
                                    mt={2}
                                />
                                <div className={classes.rowBody}>
                                    <Anchor component={Link} to={`/application/${id}`} size="sm" lineClamp={1}>
                                        {app.name || app.email}
                                    </Anchor>
                                    <Text size="xs" c="dimmed" lineClamp={1}>
                                        {intl.formatMessage({ id: `common.application-status.${status}` })}
                                        {updated ? ` · ${updated.format("DD.MM.YY")}` : ""}
                                    </Text>
                                </div>
                            </Flex>
                        )
                    })
                )}
            </ScrollArea.Autosize>

            <TextInput
                size="xs"
                label={<FormattedMessage id="pages.applications.followUp.subject" />}
                value={subject}
                onChange={(e) => setSubject(e.currentTarget.value)}
                mb="xs"
            />
            <Textarea
                size="xs"
                label={<FormattedMessage id="pages.applications.followUp.body" />}
                value={body}
                onChange={(e) => setBody(e.currentTarget.value)}
                minRows={5}
                autosize
                mb="sm"
            />

            <Button
                size="sm"
                fullWidth
                leftSection={sending ? <Loader size={16} /> : <IconMailForward size={16} />}
                disabled={sending || selected.size === 0 || !subject.trim() || !body.trim()}
                onClick={() => sendSelected()}
            >
                <FormattedMessage
                    id="pages.applications.followUp.send"
                    values={{ count: selected.size }}
                />
            </Button>
            <Button size="compact-xs" variant="subtle" fullWidth mt={6} onClick={() => refetch()} disabled={isFetching}>
                <FormattedMessage id="common.refresh" defaultMessage="Обновить" />
            </Button>
        </aside>
    )
}
