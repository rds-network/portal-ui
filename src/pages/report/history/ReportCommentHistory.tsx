import { Anchor, Flex, Paper, Text } from "@mantine/core"
import { NoteDto, ReportDto } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"
import React, { useMemo } from "react"
import { FormattedMessage } from "react-intl"
import { locales } from "src/pages/report/lib/locales"
import classes from "./ReportCommentHistory.module.scss"

type HistoryItem = {
    key: string
    reportId: string
    reportDate: string
    isCurrent: boolean
    note: NoteDto
}

type Props = {
    currentReport: ReportDto
    reports: ReportDto[]
}

export const ReportCommentHistory: React.FC<Props> = ({ currentReport, reports }) => {
    const items = useMemo(() => {
        const rows: HistoryItem[] = []
        for (const report of reports) {
            const notes = [...(report.notes ?? [])].sort((a, b) =>
                dayjs(b.createTime).diff(dayjs(a.createTime))
            )
            for (const note of notes) {
                if (!note.text?.trim()) continue
                rows.push({
                    key: `${report.id}-${note.id}`,
                    reportId: report.id!,
                    reportDate: dayjs(report.createTime).format("DD.MM.YYYY"),
                    isCurrent: report.id === currentReport.id,
                    note,
                })
            }
        }
        return rows.sort((a, b) => dayjs(b.note.createTime).diff(dayjs(a.note.createTime)))
    }, [reports, currentReport.id])

    return (
        <aside className={classes.root}>
            <Text fw={700} mb="sm">
                <FormattedMessage id={locales.commentHistory} />
            </Text>
            <Text size="xs" c="dimmed" mb="md">
                <FormattedMessage id={locales.commentHistoryHint} />
            </Text>
            {items.length === 0 ? (
                <Text size="sm" c="dimmed">
                    <FormattedMessage id={locales.commentHistoryEmpty} />
                </Text>
            ) : (
                <Flex direction="column" gap="sm">
                    {items.map((item) => (
                        <Paper key={item.key} withBorder radius="md" p="sm" className={classes.item}>
                            <Flex justify="space-between" gap="xs" mb={6} wrap="wrap">
                                <Text size="xs" c="dimmed">
                                    {dayjs(item.note.createTime).format("DD.MM.YYYY HH:mm")}
                                </Text>
                                {item.isCurrent ? (
                                    <Text size="xs" fw={600} c="teal">
                                        <FormattedMessage id={locales.commentHistoryThisReport} />
                                    </Text>
                                ) : (
                                    <Anchor href={`/report/${item.reportId}`} size="xs">
                                        <FormattedMessage
                                            id={locales.commentHistoryFromReport}
                                            values={{ date: item.reportDate }}
                                        />
                                    </Anchor>
                                )}
                            </Flex>
                            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                                {item.note.text}
                            </Text>
                        </Paper>
                    ))}
                </Flex>
            )}
        </aside>
    )
}
