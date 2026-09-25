import { Badge, Flex, Table, Text } from "@mantine/core"
import { ReportDto, UserInfoDto } from "@russian-rs/portal-api-axios"
import React, { useMemo } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { getTaskDisplayName } from "src/shared/taskTranslation/lib/taskTranslation"
import { locales } from "./lib/locales"

type Named = { code?: string; nameRu?: string; nameEn?: string; nameSr?: string }

interface Props {
    reports: ReportDto[]
    programs: Named[]
    users: Record<string, UserInfoDto>
    dateFrom: string
    dateTo: string
}

const minutesOf = (report: ReportDto) =>
    (report.tasks || []).reduce((sum, task) => sum + (task.timeSpent || 0), 0)

export const WeekDigest: React.FC<Props> = ({ reports, programs, users, dateFrom, dateTo }) => {
    const intl = useIntl()

    const digest = useMemo(() => {
        const people = new Map<string, { login: string; minutes: number; program: string; tasks: string[] }>()
        const programsMap = new Map<string, { code: string; minutes: number; people: Set<string>; reports: number }>()
        let minutes = 0

        for (const report of reports) {
            const login = report.user || "—"
            const mins = minutesOf(report)
            minutes += mins
            const programCode = report.program || ""
            const programName = programs.find((p) => p.code === programCode)
            const programLabel = programName ? getLocalizedName(programName as never, intl.locale) : programCode || "—"
            const taskNames = (report.tasks || [])
                .map((t) => getTaskDisplayName(t, false))
                .filter(Boolean)
                .slice(0, 3)

            const person = people.get(login) || { login, minutes: 0, program: programLabel, tasks: [] }
            person.minutes += mins
            person.tasks.push(...taskNames)
            people.set(login, person)

            const bucket = programsMap.get(programCode) || {
                code: programCode,
                minutes: 0,
                people: new Set<string>(),
                reports: 0,
            }
            bucket.minutes += mins
            bucket.people.add(login)
            bucket.reports += 1
            programsMap.set(programCode, bucket)
        }

        return {
            minutes,
            people: [...people.values()].sort((a, b) => b.minutes - a.minutes),
            programs: [...programsMap.values()].sort((a, b) => b.minutes - a.minutes),
        }
    }, [reports, programs, intl.locale])

    if (reports.length === 0) return null

    const hours = (m: number) => `${Math.round((m / 60) * 10) / 10} ч`

    return (
        <Flex
            direction="column"
            gap={10}
            p="md"
            mb="md"
            style={{
                border: "1px solid var(--mantine-color-gray-3)",
                borderRadius: 12,
                background: "var(--mantine-color-gray-0)",
            }}
        >
            <div>
                <Text fw={700} size="sm">
                    <FormattedMessage id={locales.digestTitle} />
                </Text>
                <Text size="xs" c="dimmed">
                    {dateFrom} — {dateTo} · {reports.length} отч. · {digest.people.length} чел. · {hours(digest.minutes)}
                </Text>
            </div>
            <Flex gap={8} wrap="wrap">
                {digest.programs.map((p) => {
                    const named = programs.find((x) => x.code === p.code)
                    const label = named ? getLocalizedName(named as never, intl.locale) : p.code || "—"
                    return (
                        <Badge key={p.code || "none"} variant="light" size="lg">
                            {label}: {hours(p.minutes)} · {p.people.size} чел.
                        </Badge>
                    )
                })}
            </Flex>
            <Table withRowBorders={false} verticalSpacing={4}>
                <Table.Tbody>
                    {digest.people.map((p) => {
                        const user = users[p.login]
                        return (
                            <Table.Tr key={p.login}>
                                <Table.Td>
                                    <Text size="sm" fw={500}>
                                        {user?.fullName || p.login}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {p.program}
                                    </Text>
                                </Table.Td>
                                <Table.Td w={80}>
                                    <Text size="sm">{hours(p.minutes)}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="xs" c="dimmed" lineClamp={2}>
                                        {[...new Set(p.tasks)].join(" · ")}
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        )
                    })}
                </Table.Tbody>
            </Table>
        </Flex>
    )
}
