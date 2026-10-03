import { Button, Loader, Tabs, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import {
    IconCheck,
    IconGift,
    IconLock,
    IconMedal,
    IconStar,
    IconChartBar,
} from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import {
    AchievementDto,
    AchievementsApiService,
} from "src/shared/api/AchievementsApiService"
import { PointMissionApiService, PointMissionDto } from "src/shared/api/PointMissionApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { MissionVisualCover, MissionVisualMark } from "src/shared/missions/missionVisuals"
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

const SHOWCASE_PREVIEW = [
    { key: "book", cost: 200, stock: 5 },
    { key: "coffee", cost: 100, stock: null as number | null },
    { key: "masterclass", cost: 300, stock: null },
    { key: "subscription", cost: 500, stock: null },
] as const

const MissionCard: React.FC<{
    mission: PointMissionDto
    claiming: boolean
    onClaim: (id: string) => void
}> = ({ mission, claiming, onClaim }) => {
    const intl = useIntl()
    const isCover = (mission.visualType || "").toUpperCase() === "COVER" && !!mission.imageUrl
    return (
        <article className={classes.missionCard}>
            <MissionVisualCover
                visualType={mission.visualType}
                imageUrl={mission.imageUrl}
                coverClassName={classes.missionCover}
            />
            <div className={classes.missionBody}>
                <div className={classes.missionHead}>
                    {!isCover && (
                        <MissionVisualMark
                            visualType={mission.visualType}
                            visualKey={mission.visualKey}
                            imageUrl={mission.imageUrl}
                            size={56}
                        />
                    )}
                    <div className={classes.missionText}>
                        <div className={classes.cardTitle}>{mission.title}</div>
                        <div className={classes.missionPts}>
                            <span className={classes.missionPtsStar}>
                                <IconStar size={12} />
                            </span>
                            <FormattedMessage
                                id="pages.achievements.missionPoints"
                                values={{ points: mission.points }}
                            />
                        </div>
                        {mission.description && (
                            <div className={classes.cardDesc}>{mission.description}</div>
                        )}
                    </div>
                </div>
                <div className={classes.missionActions}>
                    {mission.link && (
                        <Button
                            component="a"
                            href={mission.link}
                            target="_blank"
                            rel="noreferrer"
                            size="sm"
                            variant="outline"
                            className={classes.outlineBtn}
                            fullWidth
                        >
                            <FormattedMessage id="pages.achievements.missionOpen" />
                        </Button>
                    )}
                    <Button
                        size="sm"
                        className={mission.claimed ? undefined : classes.primaryBtn}
                        variant={mission.claimed ? "light" : "filled"}
                        color={mission.claimed ? "gray" : undefined}
                        disabled={!!mission.claimed || claiming}
                        onClick={() => onClaim(mission.id)}
                        fullWidth
                    >
                        {mission.claimed
                            ? intl.formatMessage({ id: "pages.achievements.missionDone" })
                            : intl.formatMessage({ id: "pages.achievements.missionClaim" })}
                    </Button>
                </div>
            </div>
        </article>
    )
}

const AchievementsPage: React.FC = () => {
    const intl = useIntl()
    const queryClient = useQueryClient()
    const [tab, setTab] = useState<string | null>("overview")
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

    const unlockedBadges = useMemo(
        () => (data?.achievements ?? []).filter((a) => a.unlocked).slice(0, 8),
        [data?.achievements]
    )

    const monthEarned = useMemo(() => {
        if (!data?.recent?.length) return 0
        const start = dayjs().startOf("month")
        return data.recent
            .filter((ev) => dayjs(ev.createdAt).isAfter(start) || dayjs(ev.createdAt).isSame(start))
            .reduce((sum, ev) => sum + (ev.points > 0 ? ev.points : 0), 0)
    }, [data?.recent])

    const overviewMissions = missions.slice(0, 3)

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

            <div className={classes.heroRow}>
                <div className={`${classes.heroCard} ${classes.heroBalance}`}>
                    <div className={classes.heroIcon}>
                        <IconStar size={22} />
                    </div>
                    <div>
                        <div className={classes.heroLabel}>
                            <FormattedMessage id="pages.achievements.balanceCardLabel" />
                        </div>
                        <div className={classes.heroValue}>
                            <FormattedMessage
                                id="pages.achievements.balanceCardValue"
                                values={{ points: data.balance }}
                            />
                        </div>
                    </div>
                </div>
                <div className={classes.heroCard}>
                    <div className={`${classes.heroIcon} ${classes.heroIconSoft}`}>
                        <IconChartBar size={22} />
                    </div>
                    <div>
                        <div className={classes.heroLabel}>
                            <FormattedMessage id="pages.achievements.monthCardLabel" />
                        </div>
                        <div className={classes.heroValueDark}>
                            <FormattedMessage
                                id="pages.achievements.monthCardValue"
                                values={{ points: monthEarned }}
                            />
                        </div>
                    </div>
                </div>
                <div className={classes.heroCard}>
                    <div className={`${classes.heroIcon} ${classes.heroIconGold}`}>
                        <IconMedal size={22} />
                    </div>
                    <div className={classes.heroAchievements}>
                        <div className={classes.heroLabel}>
                            <FormattedMessage id="pages.achievements.badgesCardLabel" />
                        </div>
                        <div className={classes.heroValueDark}>
                            <FormattedMessage
                                id="pages.achievements.badgesCardValue"
                                values={{ count: data.unlockedCount }}
                            />
                        </div>
                        {unlockedBadges.length > 0 && (
                            <div className={classes.badgeStrip}>
                                {unlockedBadges.map((badge) => (
                                    <span key={badge.id} className={classes.badgeDot} title={badge.title}>
                                        <IconCheck size={12} />
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className={classes.heroHint}>
                            <FormattedMessage id="pages.achievements.badgesForever" />
                        </div>
                    </div>
                </div>
            </div>

            <Tabs value={tab} onChange={setTab} className={classes.tabs}>
                <Tabs.List>
                    <Tabs.Tab value="overview">
                        <FormattedMessage id="pages.achievements.tabs.overview" />
                    </Tabs.Tab>
                    <Tabs.Tab value="missions">
                        <FormattedMessage id="pages.achievements.tabs.missions" />
                    </Tabs.Tab>
                    <Tabs.Tab value="showcase">
                        <FormattedMessage id="pages.achievements.tabs.showcase" />
                    </Tabs.Tab>
                    <Tabs.Tab value="history">
                        <FormattedMessage id="pages.achievements.tabs.history" />
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="overview" pt="md">
                    <div className={classes.statsRow}>
                        <div className={classes.statCard}>
                            <span className={classes.statLabel}>
                                <FormattedMessage id="pages.achievements.weekLabel" />
                            </span>
                            <span
                                className={`${classes.statValue} ${
                                    data.thisWeekVisited ? classes.ok : classes.warn
                                }`}
                            >
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
                    </div>

                    {overviewMissions.length > 0 && (
                        <section className={classes.section}>
                            <div className={classes.sectionHead}>
                                <div className={classes.sectionTitle}>
                                    <FormattedMessage id="pages.achievements.missionsTitle" />
                                </div>
                                {missions.length > 3 && (
                                    <button
                                        type="button"
                                        className={classes.linkBtn}
                                        onClick={() => setTab("missions")}
                                    >
                                        <FormattedMessage id="pages.achievements.allMissions" />
                                    </button>
                                )}
                            </div>
                            <Text size="sm" c="dimmed" mb={4}>
                                <FormattedMessage id="pages.achievements.missionsHint" />
                            </Text>
                            <div className={classes.missions}>
                                {overviewMissions.map((m) => (
                                    <MissionCard
                                        key={m.id}
                                        mission={m}
                                        claiming={claiming}
                                        onClaim={claimMission}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    <section className={classes.section}>
                        <div className={classes.sectionHead}>
                            <div className={classes.sectionTitle}>
                                <FormattedMessage id="pages.achievements.showcasePreviewTitle" />
                            </div>
                            <button
                                type="button"
                                className={classes.linkBtn}
                                onClick={() => setTab("showcase")}
                            >
                                <FormattedMessage id="pages.achievements.tabs.showcase" />
                            </button>
                        </div>
                        <div className={classes.showcaseGrid}>
                            {SHOWCASE_PREVIEW.slice(0, 4).map((item) => {
                                const shortfall = Math.max(0, item.cost - data.balance)
                                const canAfford = shortfall === 0
                                return (
                                    <article key={item.key} className={classes.rewardCard}>
                                        <div className={classes.rewardIcon}>
                                            <IconGift size={22} />
                                        </div>
                                        <div className={classes.cardTitle}>
                                            <FormattedMessage
                                                id={`pages.achievements.showcaseItems.${item.key}`}
                                            />
                                        </div>
                                        <div className={classes.rewardCost}>
                                            <FormattedMessage
                                                id="pages.achievements.showcaseCost"
                                                values={{ points: item.cost }}
                                            />
                                        </div>
                                        {item.stock != null && (
                                            <div className={classes.rewardStock}>
                                                <FormattedMessage
                                                    id="pages.achievements.showcaseStock"
                                                    values={{ count: item.stock }}
                                                />
                                            </div>
                                        )}
                                        <Button size="sm" disabled fullWidth mt="auto">
                                            {canAfford
                                                ? intl.formatMessage({
                                                      id: "pages.achievements.showcaseSoon",
                                                  })
                                                : intl.formatMessage(
                                                      { id: "pages.achievements.showcaseShort" },
                                                      { points: shortfall }
                                                  )}
                                        </Button>
                                    </article>
                                )
                            })}
                        </div>
                        <Text size="sm" c="dimmed" mt={8}>
                            <FormattedMessage id="pages.achievements.showcaseComing" />
                        </Text>
                    </section>

                    {byCategory.map(([category, items]) => (
                        <section key={category} className={classes.section}>
                            <div className={classes.sectionTitle}>
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
                                            {item.unlocked ? (
                                                <IconCheck size={20} />
                                            ) : (
                                                <IconLock size={18} />
                                            )}
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

                    <div className={classes.footerNote}>
                        <FormattedMessage id="pages.achievements.howItWorks" />
                    </div>
                </Tabs.Panel>

                <Tabs.Panel value="missions" pt="md">
                    {missions.length === 0 ? (
                        <Text c="dimmed" size="sm">
                            <FormattedMessage id="pages.achievements.missionsEmpty" />
                        </Text>
                    ) : (
                        <>
                            <Text size="sm" c="dimmed" mb="sm">
                                <FormattedMessage id="pages.achievements.missionsHint" />
                            </Text>
                            <div className={classes.missions}>
                                {missions.map((m) => (
                                    <MissionCard
                                        key={m.id}
                                        mission={m}
                                        claiming={claiming}
                                        onClaim={claimMission}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </Tabs.Panel>

                <Tabs.Panel value="showcase" pt="md">
                    <div className={classes.showcaseBanner}>
                        <IconGift size={28} />
                        <div>
                            <div className={classes.sectionTitle}>
                                <FormattedMessage id="pages.achievements.showcaseTitle" />
                            </div>
                            <Text size="sm" c="dimmed" mt={4}>
                                <FormattedMessage id="pages.achievements.showcaseComing" />
                            </Text>
                        </div>
                    </div>
                    <div className={classes.showcaseGrid}>
                        {SHOWCASE_PREVIEW.map((item) => {
                            const shortfall = Math.max(0, item.cost - data.balance)
                            const canAfford = shortfall === 0
                            return (
                                <article key={item.key} className={classes.rewardCard}>
                                    <div className={classes.rewardIcon}>
                                        <IconGift size={22} />
                                    </div>
                                    <div className={classes.cardTitle}>
                                        <FormattedMessage
                                            id={`pages.achievements.showcaseItems.${item.key}`}
                                        />
                                    </div>
                                    <div className={classes.rewardCost}>
                                        <FormattedMessage
                                            id="pages.achievements.showcaseCost"
                                            values={{ points: item.cost }}
                                        />
                                    </div>
                                    {item.stock != null && (
                                        <div className={classes.rewardStock}>
                                            <FormattedMessage
                                                id="pages.achievements.showcaseStock"
                                                values={{ count: item.stock }}
                                            />
                                        </div>
                                    )}
                                    <Button size="sm" disabled fullWidth mt="auto">
                                        {canAfford
                                            ? intl.formatMessage({
                                                  id: "pages.achievements.showcaseSoon",
                                              })
                                            : intl.formatMessage(
                                                  { id: "pages.achievements.showcaseShort" },
                                                  { points: shortfall }
                                              )}
                                    </Button>
                                </article>
                            )
                        })}
                    </div>
                </Tabs.Panel>

                <Tabs.Panel value="history" pt="md">
                    {data.recent.length === 0 ? (
                        <Text c="dimmed" size="sm">
                            <FormattedMessage id="pages.achievements.historyEmpty" />
                        </Text>
                    ) : (
                        <div className={classes.recent}>
                            {data.recent.map((ev, idx) => (
                                <div
                                    key={`${ev.code}-${ev.refId}-${idx}`}
                                    className={classes.recentRow}
                                >
                                    <span className={classes.recentTitle}>{ev.title || ev.code}</span>
                                    <span
                                        className={
                                            ev.points >= 0
                                                ? classes.recentPtsPos
                                                : classes.recentPtsNeg
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
                    )}
                </Tabs.Panel>
            </Tabs>
        </div>
    )
}

export default AchievementsPage
