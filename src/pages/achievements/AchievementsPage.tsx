import { Anchor, Button, Loader, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconCheck, IconExternalLink, IconLock, IconTrophy } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useMemo } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import {
    AchievementDto,
    AchievementsApiService,
} from "src/shared/api/AchievementsApiService"
import { PointMissionApiService } from "src/shared/api/PointMissionApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import classes from "./AchievementsPage.module.scss"

const CATEGORY_ORDER = ["presence", "onboarding", "reports", "gratitude", "trust"] as const

const categoryLabelId = (category: string) => {
    switch (category) {
        case "presence":
            return "pages.achievements.categories.presence"
        case "onboarding":
            return "pages.achievements.categories.onboarding"
        case "reports":
            return "pages.achievements.categories.reports"
        case "gratitude":
            return "pages.achievements.categories.gratitude"
        case "trust":
            return "pages.achievements.categories.trust"
        default:
            return "pages.achievements.categories.other"
    }
}

const AchievementsPage: React.FC = () => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    setDocumentTitleByLocale("pages.achievements.title")

    const { data, isLoading, isError } = useQuery({
        queryKey: ["achievements", "me"],
        queryFn: () => AchievementsApiService.me(),
        staleTime: 60_000,
    })

    const { data: missions = [] } = useQuery({
        queryKey: ["point-missions"],
        queryFn: () => PointMissionApiService.listActive(),
        staleTime: 30_000,
        enabled: !!data,
    })

    const { mutate: claimMission, isPending: claiming } = useMutation({
        mutationFn: (id: string) => PointMissionApiService.claim(id),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["point-missions"] })
            queryClient.invalidateQueries({ queryKey: ["achievements", "me"] })
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        {result.alreadyClaimed
                            ? intl.formatMessage({ id: "pages.achievements.missionAlready" })
                            : intl.formatMessage(
                                  { id: "pages.achievements.missionClaimed" },
                                  { points: result.points }
                              )}
                    </Text>,
                    null
                )
            )
        },
    })

    const byCategory = useMemo(() => {
        const list = data?.achievements ?? []
        const map = new Map<string, AchievementDto[]>()
        for (const item of list) {
            const key = item.category || "other"
            const bucket = map.get(key) ?? []
            bucket.push(item)
            map.set(key, bucket)
        }
        const ordered: Array<[string, AchievementDto[]]> = CATEGORY_ORDER.filter((c) => map.has(c)).map(
            (c) => [c, map.get(c)!]
        )
        for (const [key, items] of map) {
            if (!(CATEGORY_ORDER as readonly string[]).includes(key)) {
                ordered.push([key, items])
            }
        }
        return ordered
    }, [data?.achievements])

    if (isLoading) {
        return (
            <div className={classes.root} data-tour-id="achievements-root">
                <Loader size="sm" />
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className={classes.root} data-tour-id="achievements-root">
                <Title order={2}>
                    <FormattedMessage id="pages.achievements.title" />
                </Title>
                <div className={classes.unavailable}>
                    <FormattedMessage id="pages.achievements.unavailable" />
                </div>
            </div>
        )
    }

    return (
        <div className={classes.root} data-tour-id="achievements-root">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.achievements.title" />
                </Title>
                <Text c="dimmed" size="sm" mt={4}>
                    <FormattedMessage id="pages.achievements.description" />
                </Text>
            </div>

            <div className={classes.summary}>
                <IconTrophy size={28} className={classes.summaryIcon} />
                <div className={classes.summaryText}>
                    <span>
                        <FormattedMessage
                            id="pages.achievements.unlocked"
                            values={{ unlocked: data.unlockedCount, total: data.totalCount }}
                        />
                    </span>
                    <span className={classes.summaryPoints}>
                        <FormattedMessage
                            id="pages.achievements.points"
                            values={{ points: data.balance }}
                        />
                    </span>
                </div>
            </div>

            <div className={classes.statsRow}>
                <div className={classes.statCard}>
                    <span className={classes.statLabel}>
                        <FormattedMessage id="pages.achievements.weekLabel" />
                    </span>
                    <span className={`${classes.statValue} ${data.thisWeekVisited ? classes.ok : classes.warn}`}>
                        {data.thisWeekVisited
                            ? intl.formatMessage({ id: "pages.achievements.weekVisited" })
                            : intl.formatMessage({ id: "pages.achievements.weekMissed" })}
                    </span>
                    <span className={classes.statHint}>
                        <FormattedMessage id="pages.achievements.weekHint" />
                    </span>
                </div>
                <div className={classes.statCard}>
                    <span className={classes.statLabel}>
                        <FormattedMessage id="pages.achievements.inboxLabel" />
                    </span>
                    <span className={classes.statValue}>
                        <FormattedMessage
                            id="pages.achievements.inboxValue"
                            values={{
                                delivered: data.inbox.delivered,
                                sent: data.inbox.sent,
                            }}
                        />
                    </span>
                    <span className={classes.statHint}>
                        <FormattedMessage
                            id="pages.achievements.inboxPending"
                            values={{ pending: data.inbox.pending }}
                        />
                    </span>
                </div>
                <div className={classes.statCard}>
                    <span className={classes.statLabel}>
                        <FormattedMessage id="pages.achievements.balanceLabel" />
                    </span>
                    <span className={classes.statValue}>{data.balance}</span>
                    <span className={classes.statHint}>
                        <FormattedMessage id="pages.achievements.balanceHint" />
                    </span>
                </div>
            </div>

            {missions.length > 0 && (
                <section className={classes.category}>
                    <div className={classes.categoryTitle}>
                        <FormattedMessage id="pages.achievements.missionsTitle" />
                    </div>
                    <Text size="sm" c="dimmed" mb={4}>
                        <FormattedMessage id="pages.achievements.missionsHint" />
                    </Text>
                    <div className={classes.missions}>
                        {missions.map((m) => (
                            <article key={m.id} className={classes.missionCard}>
                                <div className={classes.missionTop}>
                                    <div className={classes.cardTitle}>{m.title}</div>
                                    <span className={classes.summaryPoints}>+{m.points}</span>
                                </div>
                                {m.description && <div className={classes.cardDesc}>{m.description}</div>}
                                <div className={classes.missionActions}>
                                    {m.link && (
                                        <Anchor href={m.link} target="_blank" rel="noreferrer" size="sm">
                                            <IconExternalLink size={14} style={{ marginRight: 4 }} />
                                            <FormattedMessage id="pages.achievements.missionOpen" />
                                        </Anchor>
                                    )}
                                    <Button
                                        size="xs"
                                        variant={m.claimed ? "light" : "filled"}
                                        color={m.claimed ? "gray" : "blue"}
                                        disabled={!!m.claimed || claiming}
                                        onClick={() => claimMission(m.id)}
                                    >
                                        {m.claimed
                                            ? intl.formatMessage({ id: "pages.achievements.missionDone" })
                                            : intl.formatMessage({ id: "pages.achievements.missionClaim" })}
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {byCategory.map(([category, items]) => (
                <section key={category} className={classes.category}>
                    <div className={classes.categoryTitle}>
                        <FormattedMessage id={categoryLabelId(category)} />
                    </div>
                    <div className={classes.grid}>
                        {items.map((item) => (
                            <article
                                key={item.id}
                                className={`${classes.card} ${
                                    item.unlocked ? classes.cardUnlocked : classes.cardLocked
                                }`}
                            >
                                <span className={classes.points}>
                                    {item.points >= 0 ? `+${item.points}` : item.points}
                                </span>
                                <div
                                    className={`${classes.iconWrap} ${
                                        item.unlocked ? classes.iconUnlocked : classes.iconLocked
                                    }`}
                                >
                                    {item.unlocked ? <IconCheck size={20} /> : <IconLock size={18} />}
                                </div>
                                <div className={classes.cardTitle}>{item.title}</div>
                                <div className={classes.cardDesc}>{item.description}</div>
                                {item.target != null && item.target > 1 && (
                                    <div className={classes.progress}>
                                        <FormattedMessage
                                            id="pages.achievements.progress"
                                            values={{
                                                progress: item.progress ?? 0,
                                                target: item.target,
                                            }}
                                        />
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            ))}

            {data.recent.length > 0 && (
                <section className={classes.category}>
                    <div className={classes.categoryTitle}>
                        <FormattedMessage id="pages.achievements.recentTitle" />
                    </div>
                    <div className={classes.recent}>
                        {data.recent.map((ev, idx) => (
                            <div key={`${ev.code}-${ev.refId}-${idx}`} className={classes.recentRow}>
                                <span className={classes.recentTitle}>
                                    {ev.title || ev.code}
                                </span>
                                <span
                                    className={
                                        ev.points >= 0 ? classes.recentPtsPos : classes.recentPtsNeg
                                    }
                                >
                                    {ev.points >= 0 ? `+${ev.points}` : ev.points}
                                </span>
                                <span className={classes.recentDate}>
                                    {dayjs(ev.createdAt).format("DD.MM.YYYY HH:mm")}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

export default AchievementsPage
