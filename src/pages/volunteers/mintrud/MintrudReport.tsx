import React, { useContext, useMemo, useState, useEffect } from "react"
import { Flex, Text, Table, NumberInput, Card, Group, Button } from "@mantine/core"
import { useIntl, FormattedMessage } from "react-intl"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams, useNavigate } from "react-router"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { UserContext } from "src/app/providers/UserContext"
import { hasPermission } from "src/shared/user/roles"
import { locales } from "../lib/locales"
import { allowedRoles } from "../lib/roles"
import { StatisticsApiService } from "src/shared/api/StatisticsApiService"
import type { CityStatistics, ProgramStatItem, Statistics } from "@rds-network/portal-api-axios"
import classes from "./MintrudReport.module.scss"
import { FinalUsersChart, VolunteersCharts } from "./MintrudCharts"
import CityStats from "./CityStats"
import { IconListCheck } from "@tabler/icons-react"
import generateMintrudReport from "src/shared/docs/mintrud-report"

const MIN_YEAR = 2023

export default function MintrudReport() {
    setDocumentTitleByLocale(locales.titleMintrud)

    const intl = useIntl()
    const navigate = useNavigate()
    const { user } = useContext(UserContext)

    if (!hasPermission(user, allowedRoles)) {
        navigate("/unauthorized")
    }

    const [searchParams, setSearchParams] = useSearchParams()
    const currentYear = new Date().getFullYear()
    const urlYear = parseInt(searchParams.get("year") || String(currentYear), 10)
    const [year, setYear] = useState<number>(
        isNaN(urlYear) ? currentYear : Math.min(Math.max(urlYear, MIN_YEAR), currentYear)
    )

    useEffect(() => {
        const params = new URLSearchParams(searchParams)
        params.set("year", String(year))
        setSearchParams(params, { replace: true })
    }, [year])

    const { data: stats, isFetching: isFetchingStats } = useQuery<Statistics>({
        queryKey: ["mintrudStatistics", year],
        queryFn: () => StatisticsApiService.getStatistics(year).then((r) => r.data),
    })

    const { data: cityStats, isFetching: isFetchingCities } = useQuery<CityStatistics>({
        queryKey: ["cityStatistics", year],
        queryFn: () => StatisticsApiService.getCityStatistics(year).then((r) => r.data),
    })

    const isFetching = isFetchingStats || isFetchingCities

    const fmtInt = (n: number | null | undefined) =>
        new Intl.NumberFormat(intl.locale, { maximumFractionDigits: 0 }).format(Number(n ?? 0))

    const fmtHours = (n: number | null | undefined) =>
        new Intl.NumberFormat(intl.locale, { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(
            Number(n ?? 0)
        )

    const programKeyByCode: Record<string, string> = {
        SOCIJALNA_ZASTITA: locales.statGroups.SOCIJALNA_ZASTITA,
        MEDIJI_I_KOMUNIKACIJE: locales.statGroups.MEDIJI_I_KOMUNIKACIJE,
        KULTURNA_DOBA: locales.statGroups.KULTURNA_DOBA,
        JAVNE_POVRSINE: locales.statGroups.JAVNE_POVRSINE,
        ZIVOTNA_SREDINA: locales.statGroups.ZIVOTNA_SREDINA,
    }
    const programName = (code: string | null | undefined) => {
        if (!code) return intl.formatMessage({ id: locales.other })
        const key = programKeyByCode[code]
        return key ? intl.formatMessage({ id: key }) : code.replaceAll("_", " ")
    }

    const totalVolunteers = stats?.finalUsersStatistics?.totalCount ?? 0
    const totalHours = stats?.programStatistics?.total?.totalTimeSpent ?? 0

    const programItems: ProgramStatItem[] = useMemo(() => {
        const items = stats?.programStatistics?.items ?? []
        return [...items].sort((a, b) => (b.data.count ?? 0) - (a.data.count ?? 0))
    }, [stats])

    const isEmptyData =
        !isFetching &&
        !!stats &&
        (stats.programStatistics?.total?.count ?? 0) === 0 &&
        (stats.programStatistics?.total?.totalTimeSpent ?? 0) === 0 &&
        (stats.finalUsersStatistics?.totalCount ?? 0) === 0

    /*
     backend function counts only active users (ones who make reports)
     thus otherDisplayValue is calculated as totalNonOther users - total users
     */
    const totalNonOther = useMemo(() => {
        return programItems.filter((p) => p.code && p.code !== "OTHER").reduce((sum, p) => sum + (p.data.count ?? 0), 0)
    }, [programItems])

    const otherDisplayValue = (stats?.finalUsersStatistics?.totalCount ?? 0) - totalNonOther

    return (
        <Flex direction="column">
            <Flex className={classes.root} direction="column" gap={16}>
                <Text className={classes.title}>
                    <FormattedMessage id={locales.titleMintrud} />
                </Text>

                {/* Год */}
                <Group align="center">
                    <Text size="sm" c="dimmed">
                        <FormattedMessage id={locales.yearLabel} />
                    </Text>
                    <NumberInput
                        value={year}
                        onChange={(v) => setYear(Number(v) || year)}
                        min={MIN_YEAR}
                        max={currentYear}
                        step={1}
                        allowDecimal={false}
                        allowNegative={false}
                        w={120}
                        disabled={isFetching}
                    />
                </Group>

                {/* Итоги */}
                <div className={classes.totals}>
                    <Card withBorder radius="md" p="md">
                        <Text size="xs" c="dimmed">
                            <FormattedMessage id={locales.totalVolunteers} />
                        </Text>
                        <Text fz={28} fw={700}>
                            {fmtInt(totalVolunteers)}
                        </Text>
                    </Card>

                    <Card withBorder radius="md" p="md">
                        <Text size="xs" c="dimmed">
                            <FormattedMessage id={locales.totalHours} />
                        </Text>
                        <Text fz={28} fw={700}>
                            {fmtHours(totalHours)}
                        </Text>
                    </Card>
                </div>

                {/* По программам */}
                <Text mt="md" fw={600}>
                    <FormattedMessage id={locales.programStats} />
                </Text>
                <Table className={classes.table} withColumnBorders striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>
                                <FormattedMessage id={locales.program} />
                            </Table.Th>
                            <Table.Th ta="right">
                                <FormattedMessage id={locales.volunteers} />
                            </Table.Th>
                            <Table.Th ta="right">
                                <FormattedMessage id={locales.hours} />
                            </Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {programItems.map((item) => (
                            <Table.Tr key={String(item.code ?? "OTHER")}>
                                <Table.Td>{programName(item.code)}</Table.Td>
                                <Table.Td ta="right">
                                    {!item.code || item.code === "OTHER"
                                        ? fmtInt(otherDisplayValue)
                                        : fmtInt(item.data.count)}
                                </Table.Td>
                                <Table.Td ta="right">{fmtHours(item.data.totalTimeSpent)}</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                    <Table.Tfoot>
                        <Table.Tr>
                            <Table.Th>
                                <FormattedMessage id={locales.total} />
                            </Table.Th>
                            <Table.Th ta="right">{fmtInt(stats?.finalUsersStatistics?.totalCount)}</Table.Th>
                            <Table.Th ta="right">{fmtHours(stats?.programStatistics?.total?.totalTimeSpent)}</Table.Th>
                        </Table.Tr>
                    </Table.Tfoot>
                </Table>

                {/* Волонтёры */}
                <Text mt="lg" fw={600}>
                    <FormattedMessage id={locales.volunteerStats} />
                </Text>
                <VolunteersCharts stats={stats} />

                {/* Конечные пользователи */}
                <Text mt="lg" fw={600}>
                    <FormattedMessage id={locales.finalUsersStats} />
                </Text>
                <FinalUsersChart stats={stats} />

                {stats && <CityStats data={cityStats} />}

                {/* Кнопка генерации PDF */}
                <Button
                    variant="gradient"
                    rightSection={<IconListCheck size={15} />}
                    disabled={stats == null || isFetching}
                    onClick={() => {
                        generateMintrudReport(stats, otherDisplayValue)
                    }}
                >
                    <FormattedMessage id={locales.generateReport} />
                </Button>

                {/* Пусто */}
                {isEmptyData && (
                    <Flex mt="xl" align="center" justify="center" direction="column" gap={8}>
                        <Text c="dimmed">
                            <FormattedMessage id={locales.empty} />
                        </Text>
                    </Flex>
                )}
            </Flex>
        </Flex>
    )
}
