import React from "react"
import { FormattedMessage, useIntl } from "react-intl"
import type { Statistics } from "@rds-network/portal-api-axios"
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    XAxis,
    YAxis,
    Bar,
    CartesianGrid,
} from "recharts"
import { locales } from "../lib/locales"
import { Text } from "@mantine/core"
import { useReducedMotion } from "@mantine/hooks"
import classes from "./MintrudReport.module.scss"

const COLORS = ["#238b81", "#538ca5", "#b99652", "#bb7380", "#8983b4", "#71b8a7", "#bc8d69", "#82969b", "#94ab70"]

export function VolunteersCharts({ stats }: { stats?: Statistics }) {
    const intl = useIntl()
    const reducedMotion = useReducedMotion()
    if (!stats) return null

    const ageData = [
        {
            name: intl.formatMessage({ id: locales.age15to18, defaultMessage: "15–18" }),
            value: stats.volunteerStatistics?.age15to18Count ?? 0,
        },
        {
            name: intl.formatMessage({ id: locales.age18to30, defaultMessage: "18–30" }),
            value: stats.volunteerStatistics?.age18to30Count ?? 0,
        },
        {
            name: intl.formatMessage({ id: locales.age30to40, defaultMessage: "30–40" }),
            value: stats.volunteerStatistics?.age30to40Count ?? 0,
        },
        {
            name: intl.formatMessage({ id: locales.age40to65, defaultMessage: "40–65" }),
            value: stats.volunteerStatistics?.age40to65Count ?? 0,
        },
        {
            name: intl.formatMessage({ id: locales.age65AndAbove, defaultMessage: "65+" }),
            value: stats.volunteerStatistics?.age65AndAboveCount ?? 0,
        },
    ]

    const genderData = [
        {
            name: intl.formatMessage({ id: locales.genderFemale, defaultMessage: "Женщины" }),
            value: stats.volunteerStatistics?.femaleCount ?? 0,
        },
        {
            name: intl.formatMessage({ id: locales.genderMale, defaultMessage: "Мужчины" }),
            value: stats.volunteerStatistics?.maleCount ?? 0,
        },
    ]

    const statusData = [
        {
            name: intl.formatMessage({ id: locales.citizens, defaultMessage: "Граждане" }),
            value: stats.volunteerStatistics?.citizensCount ?? 0,
        },
        {
            name: intl.formatMessage({ id: locales.foreigners, defaultMessage: "Иностранцы" }),
            value: stats.volunteerStatistics?.foreignersCount ?? 0,
        },
    ]

    const allZero =
        ageData.every((d) => d.value === 0) &&
        genderData.every((d) => d.value === 0) &&
        statusData.every((d) => d.value === 0)
    if (allZero) return null

    return (
        <div className={classes.chartGrid}>
            <div className={classes.chartCard}>
                <Text className={classes.chartTitle}>
                    <FormattedMessage id={locales.ageStatsTitle} />
                </Text>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={ageData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--portal-border)" />
                        <XAxis dataKey="name" interval={0} tick={{ fontSize: 12, fill: "var(--portal-muted)" }} />
                        <YAxis allowDecimals={false} width={32} tick={{ fontSize: 12, fill: "var(--portal-muted)" }} />
                        <Tooltip
                            contentStyle={{
                                background: "var(--portal-solid)",
                                border: "1px solid var(--portal-border)",
                                borderRadius: 12,
                                color: "var(--portal-ink)",
                            }}
                        />
                        <Bar dataKey="value" isAnimationActive={!reducedMotion} radius={[5, 5, 0, 0]}>
                            {ageData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className={classes.chartCard}>
                <Text className={classes.chartTitle}>
                    <FormattedMessage id={locales.genderStatsTitle} />
                </Text>
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                        <Pie
                            data={genderData}
                            dataKey="value"
                            isAnimationActive={!reducedMotion}
                            nameKey="name"
                            innerRadius="48%"
                            outerRadius="74%"
                            paddingAngle={2}
                        >
                            {genderData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                background: "var(--portal-solid)",
                                border: "1px solid var(--portal-border)",
                                borderRadius: 12,
                                color: "var(--portal-ink)",
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, lineHeight: "20px" }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className={classes.chartCard}>
                <Text className={classes.chartTitle}>
                    <FormattedMessage id={locales.citizenshipStatsTitle} />
                </Text>
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                        <Pie
                            data={statusData}
                            dataKey="value"
                            isAnimationActive={!reducedMotion}
                            nameKey="name"
                            innerRadius="48%"
                            outerRadius="74%"
                            paddingAngle={2}
                        >
                            {statusData.map((_, i) => (
                                <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                background: "var(--portal-solid)",
                                border: "1px solid var(--portal-border)",
                                borderRadius: 12,
                                color: "var(--portal-ink)",
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, lineHeight: "20px" }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export function FinalUsersChart({ stats }: { stats?: Statistics }) {
    const intl = useIntl()
    const reducedMotion = useReducedMotion()
    if (!stats) return null

    const data = [
        {
            name: intl.formatMessage({ id: locales.culturalAssets, defaultMessage: "Культурные ценности" }),
            value: stats.finalUsersStatistics?.culturalAssetsCount ?? 0,
        },
        {
            name: intl.formatMessage({ id: locales.naturalAssets, defaultMessage: "Природные объекты" }),
            value: stats.finalUsersStatistics?.naturalAssetsCount ?? 0,
        },
        {
            name: intl.formatMessage({ id: locales.publicAreas, defaultMessage: "Общественные пространства" }),
            value: stats.finalUsersStatistics?.publicAreasCount ?? 0,
        },
        {
            name: intl.formatMessage({ id: locales.finalOther, defaultMessage: "Другое" }),
            value: stats.finalUsersStatistics?.otherCount ?? 0,
        },
    ]

    if (data.every((d) => d.value === 0)) return null

    return (
        <div className={classes.chartCard}>
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        isAnimationActive={!reducedMotion}
                        nameKey="name"
                        innerRadius="40%"
                        outerRadius="62%"
                        label
                        paddingAngle={2}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            background: "var(--portal-solid)",
                            border: "1px solid var(--portal-border)",
                            borderRadius: 12,
                            color: "var(--portal-ink)",
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, lineHeight: "20px" }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}
const CITY_BAR_HEIGHT = 28

export function CityStatsChart({ data }: { data: { name: string; value: number }[] }) {
    const reducedMotion = useReducedMotion()
    if (!data.length) return null

    return (
        <div className={classes.chartCard}>
            <Text className={classes.chartTitle}>
                <FormattedMessage id={locales.cityStatsTitle} values={{ count: data.length }} />
            </Text>
            <ResponsiveContainer width="100%" height={data.length * CITY_BAR_HEIGHT + 40}>
                <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--portal-border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--portal-muted)" }} />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        interval={0}
                        tick={{ fontSize: 12, fill: "var(--portal-muted)" }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "var(--portal-solid)",
                            border: "1px solid var(--portal-border)",
                            borderRadius: 12,
                            color: "var(--portal-ink)",
                        }}
                    />
                    <Bar dataKey="value" fill={COLORS[0]} isAnimationActive={!reducedMotion} radius={[0, 5, 5, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
