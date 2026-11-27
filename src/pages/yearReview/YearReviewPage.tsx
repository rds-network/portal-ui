import { Button, Loader, Text } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import {
    IconChevronLeft,
    IconChevronRight,
    IconDownload,
    IconFileText,
    IconFlag,
    IconHeart,
    IconMedal,
    IconX,
} from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ReactNode, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useNavigate, useParams } from "react-router"
import { FilesApiService } from "src/shared/api/FilesApiService"
import {
    yearReviewDefaultYear,
    YearReviewApiService,
    YearReviewDto,
} from "src/shared/api/YearReviewApiService"
import { generateAnnualZahvalnicaPdf } from "src/shared/docs/annualZahvalnicaPdf"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import YearReviewConfetti from "./YearReviewConfetti"
import classes from "./YearReviewPage.module.scss"

const PROGRAM_FALLBACK = "RADIMO"

const BG = {
    intro: "/assets/year-review/intro-path.png",
    weeks: "/assets/year-review/active-weeks-calendar.png",
    points: "/assets/year-review/earned-points-coins.png",
    rank: "/assets/year-review/ranking-podium.png",
    curator: "/assets/year-review/curator-team.png",
    opportunities: "/assets/year-review/opportunities.png",
    super: "/assets/year-review/super-participant-award.png",
} as const

const METRIC_ICON = {
    reports: { Icon: IconFileText, className: classes.metricIconReports },
    badges: { Icon: IconMedal, className: classes.metricIconBadges },
    missions: { Icon: IconFlag, className: classes.metricIconMissions },
    thanks: { Icon: IconHeart, className: classes.metricIconThanks },
} as const

type Slide = {
    key: string
    background: string
    content: ReactNode
    contentClassName?: string
    showDownload?: boolean
}

const YearReviewPage = () => {
    const intl = useIntl()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const params = useParams()
    const year = Number(params.year) || yearReviewDefaultYear()
    setDocumentTitleByLocale("pages.yearReview.title")

    const { data, isLoading, isError } = useQuery({
        queryKey: ["year-review", year],
        queryFn: () => YearReviewApiService.get(year),
    })

    const [index, setIndex] = useState(0)
    const [burstKey, setBurstKey] = useState(1)
    const slides = useMemo(() => buildSlides(data, year, intl.locale), [data, year, intl.locale])

    useEffect(() => {
        setBurstKey((v) => v + 1)
    }, [index])

    const go = (next: number) => {
        setIndex(next)
    }

    const issueMutation = useMutation({
        mutationFn: async () => {
            const cert =
                data?.certificate ?? (await YearReviewApiService.issueCertificate(year))
            const fresh = await YearReviewApiService.get(year)
            if (!fresh) throw new Error("review missing")
            const blob = await generateAnnualZahvalnicaPdf({
                certificate: cert,
                stats: fresh.stats,
                download: true,
            })
            try {
                if (!cert.pdfFileId) {
                    const file = new File([blob], `Zahvalnica_${year}.pdf`, { type: "application/pdf" })
                    const uploaded = await FilesApiService.uploadFile(file)
                    if (uploaded.data?.id) {
                        await YearReviewApiService.attachPdf(cert.id, String(uploaded.data.id))
                    }
                }
            } catch {
                /* download already happened */
            }
            return cert
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["year-review", year] })
            queryClient.invalidateQueries({ queryKey: ["my-documents"] })
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.yearReview.certificateReady" />
                    </Text>,
                    null
                )
            )
            setBurstKey((v) => v + 1)
        },
        onError: (err) => {
            notifications.show({
                color: "red",
                message: err instanceof Error ? err.message : intl.formatMessage({ id: "errors.request" }),
            })
        },
    })

    const close = () => navigate("/achievements")
    const safeIndex = Math.min(index, Math.max(slides.length - 1, 0))
    const slide = slides[safeIndex]

    if (isLoading) {
        return (
            <div className={classes.overlay}>
                <Loader color="teal" />
            </div>
        )
    }

    if (isError || !data || !slide) {
        return (
            <div className={classes.overlay} onClick={close}>
                <div className={classes.stage} onClick={(e) => e.stopPropagation()}>
                    <Button className={classes.close} variant="subtle" onClick={close}>
                        <IconX size={18} />
                    </Button>
                    <div className={classes.content}>
                        <p className={classes.title}>
                            <FormattedMessage id="pages.yearReview.loadError" />
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={classes.overlay} onClick={close}>
            <div className={classes.stage} onClick={(e) => e.stopPropagation()}>
                <Button className={classes.close} variant="subtle" color="gray" onClick={close}>
                    <IconX size={18} />
                </Button>
                <div className={classes.slide}>
                    <img
                        className={classes.background}
                        src={slide.background}
                        alt=""
                        draggable={false}
                    />
                    <div className={classes.fadeTop} />
                    <div
                        className={`${classes.content} ${classes.contentTop} ${classes.readable} ${slide.contentClassName ?? ""}`}
                    >
                        {slide.content}
                    </div>
                    <YearReviewConfetti burstKey={burstKey} />
                    <div className={classes.navigation}>
                        <Button
                            variant="light"
                            color="teal"
                            disabled={safeIndex === 0}
                            onClick={() => go(Math.max(0, safeIndex - 1))}
                            leftSection={<IconChevronLeft size={16} />}
                        >
                            <FormattedMessage id="pages.yearReview.prev" />
                        </Button>
                        <div className={classes.dots}>
                            {slides.map((item, i) => (
                                <span
                                    key={item.key}
                                    className={`${classes.dot} ${i === safeIndex ? classes.dotActive : ""}`}
                                />
                            ))}
                        </div>
                        {safeIndex < slides.length - 1 ? (
                            <Button
                                color="teal"
                                onClick={() => go(Math.min(slides.length - 1, safeIndex + 1))}
                                rightSection={<IconChevronRight size={16} />}
                            >
                                <FormattedMessage id="pages.yearReview.next" />
                            </Button>
                        ) : slide.showDownload ? (
                            <Button
                                color="teal"
                                leftSection={<IconDownload size={16} />}
                                loading={issueMutation.isPending}
                                onClick={() => issueMutation.mutate()}
                            >
                                <FormattedMessage id="pages.yearReview.downloadCertificate" />
                            </Button>
                        ) : (
                            <Button color="teal" component={Link} to="/achievements">
                                <FormattedMessage id="pages.yearReview.done" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function programLabel(stats: YearReviewDto["stats"], locale: string): string {
    const localized = getLocalizedName(
        {
            nameRu: stats.programNameRu ?? undefined,
            nameEn: stats.programNameEn ?? undefined,
            nameSr: stats.programNameSr ?? undefined,
        },
        locale
    ).trim()
    return localized || PROGRAM_FALLBACK
}

function projectLabel(stats: YearReviewDto["stats"], locale: string): string {
    return getLocalizedName(
        {
            nameRu: stats.projectNameRu ?? undefined,
            nameEn: stats.projectNameEn ?? undefined,
            nameSr: stats.projectNameSr ?? undefined,
        },
        locale
    ).trim()
}

/** Keep given name only — drop surname / middle parts. */
function firstName(displayName: string): string {
    const token = displayName.trim().split(/\s+/)[0] ?? ""
    return token || displayName.trim()
}

function buildSlides(data: YearReviewDto | null | undefined, year: number, locale: string): Slide[] {
    if (!data) return []
    const s = data.stats
    const program = programLabel(s, locale)
    const project = projectLabel(s, locale)
    const name = firstName(s.displayName)
    const hours = s.hoursWorked ?? 0
    const isCurator = !!s.isCurator
    const isModerator = !!s.isModerator
    const thanks = s.curatorGratitudes + s.managerGratitudes
    const metrics = [
        s.acceptedReports > 0
            ? {
                  key: "reports" as const,
                  value: s.acceptedReports,
                  labelId: "pages.yearReview.acceptedReports",
              }
            : null,
        s.badgesEarned > 0
            ? {
                  key: "badges" as const,
                  value: s.badgesEarned,
                  labelId: "pages.yearReview.badges",
              }
            : null,
        s.completedTasks > 0
            ? {
                  key: "missions" as const,
                  value: s.completedTasks,
                  labelId: "pages.yearReview.missions",
              }
            : null,
        thanks > 0
            ? {
                  key: "thanks" as const,
                  value: thanks,
                  labelId: "pages.yearReview.gratitudes",
              }
            : null,
    ].filter(Boolean) as Array<{
        key: keyof typeof METRIC_ICON
        value: number
        labelId: string
    }>

    const slides: Slide[] = [
        {
            key: "intro",
            background: BG.intro,
            content: (
                <>
                    <div className={classes.badge}>
                        {year} / <FormattedMessage id="pages.yearReview.yourResults" />
                    </div>
                    <h2 className={classes.title}>
                        <FormattedMessage
                            id={
                                project
                                    ? "pages.yearReview.yourYearInProgramProject"
                                    : "pages.yearReview.yourYearInProgram"
                            }
                            values={{
                                name: <span className={classes.displayName}>{name}</span>,
                                program,
                                project,
                            }}
                        />
                    </h2>
                    <p className={classes.lead}>
                        <FormattedMessage id="pages.yearReview.lookWhatHappened" />
                    </p>
                </>
            ),
        },
        {
            key: "weeks",
            background: BG.weeks,
            content: (
                <>
                    <div className={classes.badge}>
                        <FormattedMessage id="pages.yearReview.presence" />
                    </div>
                    <p className={classes.big}>
                        <span className={classes.bigAccent}>{s.activeWeeks}</span>
                    </p>
                    <h2 className={classes.title}>
                        <FormattedMessage id="pages.yearReview.weeksOnline" />
                    </h2>
                    <p className={classes.lead}>
                        <FormattedMessage id="pages.yearReview.weeksHint" />
                    </p>
                    {s.longestStreak > 1 && (
                        <p className={classes.lead}>
                            <FormattedMessage
                                id="pages.yearReview.bestStreak"
                                values={{ streak: s.longestStreak }}
                            />
                        </p>
                    )}
                </>
            ),
        },
        {
            key: "points",
            background: BG.points,
            content: (
                <>
                    <div className={classes.badge}>
                        <FormattedMessage id="pages.yearReview.activity" />
                    </div>
                    <p className={classes.big}>
                        <span className={classes.bigAccent}>{s.earnedPoints}</span>
                    </p>
                    <h2 className={classes.title}>
                        <FormattedMessage id="pages.yearReview.pointsTitle" />
                    </h2>
                    {metrics.length > 0 && (
                        <div className={classes.metricList}>
                            {metrics.map((m) => {
                                const meta = METRIC_ICON[m.key]
                                const Icon = meta.Icon
                                return (
                                    <div key={m.key} className={classes.metric}>
                                        <span className={`${classes.metricIcon} ${meta.className}`}>
                                            <Icon size={20} stroke={2.2} />
                                        </span>
                                        <div className={classes.metricText}>
                                            <span className={classes.metricValue}>{m.value}</span>
                                            <span className={classes.metricLabel}>
                                                <FormattedMessage id={m.labelId} />
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            ),
        },
        {
            key: "rank",
            background: BG.rank,
            contentClassName:
                s.bestRank != null && s.bestRank > 0 ? undefined : classes.contentCenter,
            content:
                s.bestRank != null && s.bestRank > 0 ? (
                    <>
                        <div className={classes.badge}>
                            <FormattedMessage id="pages.yearReview.bestResult" />
                        </div>
                        <p className={classes.big}>
                            #<span className={classes.rankAccent}>{s.bestRank}</span>
                        </p>
                        <h2 className={classes.title}>
                            <FormattedMessage id="pages.yearReview.rankPlace" />
                        </h2>
                        <p className={classes.lead}>
                            <FormattedMessage id="pages.yearReview.rankThanks" />
                        </p>
                        {s.bestRank > 50 && s.irregularReporting && (
                            <p className={classes.lead}>
                                <FormattedMessage id="pages.yearReview.rankLateReports" />
                            </p>
                        )}
                        {s.bestRank > 50 && (
                            <p className={classes.lead}>
                                <FormattedMessage id="pages.yearReview.rankHopeBetter" />
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <h2 className={classes.title} style={{ fontSize: "clamp(2rem, 8vw, 2.6rem)" }}>
                            <FormattedMessage id="pages.yearReview.rankMissingTitle" />
                        </h2>
                        <p className={classes.lead} style={{ fontSize: "1.2rem" }}>
                            <FormattedMessage id="pages.yearReview.rankMissingBody" />
                        </p>
                    </>
                ),
        },
    ]

    const directions = s.directionsCount ?? 0
    const delegates = s.delegatesCount ?? 0
    const reviewed = s.reportsReviewed ?? 0
    const helped = s.peopleHelped ?? 0
    if (s.isTeamBuilder || isCurator || isModerator || directions > 0 || delegates > 0 || reviewed > 0 || helped > 0) {
        const roleHintId =
            isCurator && isModerator
                ? "pages.yearReview.teamBuilderRolesBoth"
                : isModerator
                  ? "pages.yearReview.teamBuilderRolesModerator"
                  : isCurator
                    ? "pages.yearReview.teamBuilderRolesCurator"
                    : "pages.yearReview.teamBuilderHint"
        slides.push({
            key: "team",
            background: BG.curator,
            contentClassName: classes.contentDark,
            content: (
                <>
                    <h2 className={`${classes.title} ${classes.heroOnDark}`}>
                        <FormattedMessage id="pages.yearReview.teamBuilderTitle" />
                    </h2>
                    {(isCurator || isModerator) && (
                        <div className={classes.roleChips}>
                            {isCurator && (
                                <span className={classes.roleChip}>
                                    <FormattedMessage id="pages.yearReview.roleCurator" />
                                </span>
                            )}
                            {isModerator && (
                                <span className={`${classes.roleChip} ${classes.roleChipModerator}`}>
                                    <FormattedMessage id="pages.yearReview.roleModerator" />
                                </span>
                            )}
                        </div>
                    )}
                    <div className={classes.roleGrid}>
                        {(
                            [
                                [directions, "pages.yearReview.directions"],
                                [delegates, "pages.yearReview.delegates"],
                                [reviewed, "pages.yearReview.reportsReviewed"],
                                [helped, "pages.yearReview.peopleHelped"],
                            ] as const
                        )
                            .filter(([value]) => value > 0)
                            .map(([value, labelId]) => (
                                <div key={labelId} className={classes.roleCard}>
                                    <div className={classes.roleValue}>{value}</div>
                                    <div className={classes.roleLabel}>
                                        <FormattedMessage id={labelId} />
                                    </div>
                                </div>
                            ))}
                    </div>
                    <p className={`${classes.lead} ${classes.hintOnDark}`}>
                        <FormattedMessage id={roleHintId} />
                    </p>
                </>
            ),
        })
    }

    const ideas = s.ideasCreated ?? 0
    const respIn = s.responsesReceived ?? 0
    const respOut = s.responsesSent ?? 0
    const teams = s.teamsJoined ?? 0
    if (ideas > 0 || respIn > 0 || respOut > 0 || teams > 0) {
        slides.push({
            key: "opportunities",
            background: BG.opportunities,
            contentClassName: classes.contentDark,
            content: (
                <>
                    <h2 className={`${classes.title} ${classes.heroOnDark}`}>
                        <FormattedMessage id="pages.yearReview.opportunitiesTitle" />
                    </h2>
                    <div className={classes.roleGrid}>
                        {(
                            [
                                [ideas, "pages.yearReview.ideasCreated"],
                                [respIn, "pages.yearReview.responsesReceived"],
                                [respOut, "pages.yearReview.responsesSent"],
                                [teams, "pages.yearReview.teamsJoined"],
                            ] as const
                        )
                            .filter(([value]) => value > 0)
                            .map(([value, labelId]) => (
                                <div key={labelId} className={classes.roleCard}>
                                    <div className={classes.roleValue}>{value}</div>
                                    <div className={classes.roleLabel}>
                                        <FormattedMessage id={labelId} />
                                    </div>
                                </div>
                            ))}
                    </div>
                    <p className={`${classes.lead} ${classes.hintOnDark}`}>
                        <FormattedMessage id="pages.yearReview.opportunitiesHint" />
                    </p>
                </>
            ),
        })
    }

    if (data.eligibility.eligible || data.certificate) {
        const reasons =
            data.certificate?.qualificationReasons?.length
                ? data.certificate.qualificationReasons
                : data.eligibility.reasons
        slides.push({
            key: "super",
            background: BG.super,
            showDownload: true,
            content: (
                <>
                    <img
                        className={classes.crown}
                        src="/assets/year-review/super-crown.png"
                        alt=""
                        draggable={false}
                    />
                    <div className={`${classes.badge} ${classes.goldBadge}`}>
                        <FormattedMessage id="pages.yearReview.superBadge" />
                    </div>
                    <h2 className={classes.title}>
                        <FormattedMessage id="pages.yearReview.superTitle" values={{ program }} />
                    </h2>
                    {reasons.length > 0 && (
                        <div className={classes.reasons}>
                            {reasons.map((r) => (
                                <span key={r} className={classes.reasonChip}>
                                    {r}
                                </span>
                            ))}
                            {hours > 0 && (
                                <span className={classes.reasonChip}>
                                    <FormattedMessage
                                        id="pages.yearReview.hoursInCertificate"
                                        values={{ hours }}
                                    />
                                </span>
                            )}
                        </div>
                    )}
                    {reasons.length === 0 && hours > 0 && (
                        <div className={classes.reasons}>
                            <span className={classes.reasonChip}>
                                <FormattedMessage
                                    id="pages.yearReview.hoursInCertificate"
                                    values={{ hours }}
                                />
                            </span>
                        </div>
                    )}
                    <div className={classes.preview}>
                        <div className={classes.previewTitle}>
                            <FormattedMessage id="pages.yearReview.documentName" values={{ year }} />
                        </div>
                        {data.certificate ? (
                            <>
                                <div className={classes.previewMeta}>
                                    {data.certificate.certificateNumber}
                                </div>
                                <div className={classes.previewMeta}>
                                    {data.certificate.recipientFullName || s.displayName}
                                </div>
                            </>
                        ) : (
                            <div className={classes.previewMeta}>{s.displayName}</div>
                        )}
                        {hours > 0 && (
                            <div className={classes.previewMeta}>
                                <FormattedMessage
                                    id="pages.yearReview.hoursWorked"
                                    values={{ hours }}
                                />
                                {s.acceptedReports > 0
                                    ? ` · ${s.acceptedReports} 📋`
                                    : ""}
                            </div>
                        )}
                    </div>
                    <p className={classes.lead}>
                        <FormattedMessage id="pages.yearReview.superHint" />
                    </p>
                </>
            ),
        })
    }

    return slides
}

export default YearReviewPage
