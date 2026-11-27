import { Button, Loader, Text } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconChevronLeft, IconChevronRight, IconDownload, IconX } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ReactNode, useMemo, useState } from "react"
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
import classes from "./YearReviewPage.module.scss"

const PROGRAM_FALLBACK = "RADIMO"

const BG = {
    intro: "/assets/year-review/intro-path.png",
    weeks: "/assets/year-review/active-weeks-calendar.png",
    points: "/assets/year-review/earned-points-coins.png",
    rank: "/assets/year-review/ranking-podium.png",
    super: "/assets/year-review/super-participant-award.png",
} as const

type Slide = {
    key: string
    background: string
    content: ReactNode
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
    const slides = useMemo(() => buildSlides(data, year, intl.locale), [data, year, intl.locale])

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
                    <div className={`${classes.content} ${classes.contentTop} ${classes.readable}`}>
                        {slide.content}
                    </div>
                    <div className={classes.navigation}>
                        <Button
                            variant="light"
                            color="teal"
                            disabled={safeIndex === 0}
                            onClick={() => setIndex((v) => Math.max(0, v - 1))}
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
                                onClick={() => setIndex((v) => Math.min(slides.length - 1, v + 1))}
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

function buildSlides(data: YearReviewDto | null | undefined, year: number, locale: string): Slide[] {
    if (!data) return []
    const s = data.stats
    const program = programLabel(s, locale)
    const thanks = s.curatorGratitudes + s.managerGratitudes
    const metrics = [
        s.acceptedReports > 0
            ? {
                  key: "reports",
                  value: s.acceptedReports,
                  labelId: "pages.yearReview.acceptedReports",
              }
            : null,
        s.badgesEarned > 0
            ? { key: "badges", value: s.badgesEarned, labelId: "pages.yearReview.badges" }
            : null,
        s.completedTasks > 0
            ? { key: "missions", value: s.completedTasks, labelId: "pages.yearReview.missions" }
            : null,
        thanks > 0 ? { key: "thanks", value: thanks, labelId: "pages.yearReview.gratitudes" } : null,
    ].filter(Boolean) as Array<{ key: string; value: number; labelId: string }>

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
                            id="pages.yearReview.yourYearInProgram"
                            values={{ program }}
                        />
                    </h2>
                    <p className={classes.lead}>
                        <FormattedMessage
                            id="pages.yearReview.lookWhatHappened"
                            values={{
                                name: (
                                    <span className={classes.displayName}>{s.displayName}</span>
                                ),
                            }}
                        />
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
                        <div
                            className={`${classes.metricGrid} ${
                                metrics.length === 1
                                    ? classes.metricGridOne
                                    : metrics.length === 3
                                      ? classes.metricGridThree
                                      : ""
                            }`}
                        >
                            {metrics.map((m) => (
                                <div key={m.key} className={classes.metric}>
                                    <div className={classes.metricValue}>{m.value}</div>
                                    <div className={classes.metricLabel}>
                                        <FormattedMessage id={m.labelId} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ),
        },
        {
            key: "rank",
            background: BG.rank,
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
                    </>
                ) : (
                    <>
                        <div className={classes.badge}>
                            <FormattedMessage id="pages.yearReview.bestResult" />
                        </div>
                        <h2 className={classes.title}>
                            <FormattedMessage id="pages.yearReview.rankMissingTitle" />
                        </h2>
                        <p className={classes.lead}>
                            <FormattedMessage id="pages.yearReview.rankMissingBody" />
                        </p>
                    </>
                ),
        },
    ]

    // Slide 5 only for super-participants (eligible or already issued).
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
                    <div className={`${classes.badge} ${classes.goldBadge}`}>
                        <FormattedMessage id="pages.yearReview.superBadge" />
                    </div>
                    <h2 className={classes.title}>
                        <FormattedMessage
                            id="pages.yearReview.superTitle"
                            values={{ program }}
                        />
                    </h2>
                    {reasons.length > 0 && (
                        <div className={classes.reasons}>
                            {reasons.map((r) => (
                                <span key={r} className={classes.reasonChip}>
                                    {r}
                                </span>
                            ))}
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
