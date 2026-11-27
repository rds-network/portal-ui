import { Button, Loader, Text } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconChevronLeft, IconChevronRight, IconDownload, IconX } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
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
import classes from "./YearReviewPage.module.scss"

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

    const slides = useMemo(() => buildSlides(data, year, intl), [data, year, intl])

    const issueMutation = useMutation({
        mutationFn: async () => {
            const cert = await YearReviewApiService.issueCertificate(year)
            const fresh = await YearReviewApiService.get(year)
            if (!fresh) throw new Error("review missing")
            const blob = await generateAnnualZahvalnicaPdf({
                certificate: cert,
                stats: fresh.stats,
                download: true,
            })
            try {
                const file = new File([blob], `Zahvalnica_${year}.pdf`, { type: "application/pdf" })
                const uploaded = await FilesApiService.uploadFile(file)
                if (uploaded.data?.id) {
                    await YearReviewApiService.attachPdf(cert.id, String(uploaded.data.id))
                }
            } catch {
                /* PDF already downloaded; attach is best-effort */
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

    if (isLoading) {
        return (
            <div className={classes.overlay}>
                <Loader color="teal" />
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className={classes.overlay} onClick={close}>
                <div className={classes.stage} onClick={(e) => e.stopPropagation()}>
                    <Button className={classes.close} variant="subtle" onClick={close}>
                        <IconX size={18} />
                    </Button>
                    <div className={classes.card}>
                        <p className={classes.title}>
                            <FormattedMessage id="pages.yearReview.loadError" />
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const slide = slides[Math.min(index, slides.length - 1)]

    return (
        <div className={classes.overlay} onClick={close}>
            <div className={classes.stage} onClick={(e) => e.stopPropagation()}>
                <Button className={classes.close} variant="subtle" color="gray" onClick={close}>
                    <IconX size={18} />
                </Button>
                <div className={classes.card}>{slide}</div>
                <div className={classes.nav}>
                    <Button
                        variant="light"
                        color="teal"
                        disabled={index === 0}
                        onClick={() => setIndex((v) => Math.max(0, v - 1))}
                        leftSection={<IconChevronLeft size={16} />}
                    >
                        <FormattedMessage id="pages.yearReview.prev" />
                    </Button>
                    <div className={classes.dots}>
                        {slides.map((_, i) => (
                            <span
                                key={i}
                                className={`${classes.dot} ${i === index ? classes.dotActive : ""}`}
                            />
                        ))}
                    </div>
                    {index < slides.length - 1 ? (
                        <Button
                            color="teal"
                            onClick={() => setIndex((v) => Math.min(slides.length - 1, v + 1))}
                            rightSection={<IconChevronRight size={16} />}
                        >
                            <FormattedMessage id="pages.yearReview.next" />
                        </Button>
                    ) : data.eligibility.eligible ? (
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
    )
}

function buildSlides(data: YearReviewDto | null | undefined, year: number, intl: ReturnType<typeof useIntl>) {
    if (!data) return []
    const s = data.stats
    const slides = [
        <div key="intro">
            <div className={classes.badge}>
                {year} / <FormattedMessage id="pages.yearReview.yourResults" />
            </div>
            <h2 className={classes.title}>
                <FormattedMessage id="pages.yearReview.yourYearInRadimo" />
            </h2>
            <p className={classes.lead}>
                <FormattedMessage
                    id="pages.yearReview.lookWhatHappened"
                    values={{ name: s.displayName }}
                />
            </p>
        </div>,
        <div key="weeks">
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
        </div>,
        <div key="points">
            <div className={classes.badge}>
                <FormattedMessage id="pages.yearReview.activity" />
            </div>
            <p className={classes.big}>
                <span className={classes.bigAccent}>{s.earnedPoints}</span>
            </p>
            <h2 className={classes.title}>
                <FormattedMessage id="pages.yearReview.pointsTitle" />
            </h2>
            <div className={classes.metricGrid}>
                <div className={classes.metric}>
                    <div className={classes.metricValue}>{s.acceptedReports}</div>
                    <div className={classes.metricLabel}>
                        <FormattedMessage id="pages.yearReview.acceptedReports" />
                    </div>
                </div>
                <div className={classes.metric}>
                    <div className={classes.metricValue}>{s.badgesEarned}</div>
                    <div className={classes.metricLabel}>
                        <FormattedMessage id="pages.yearReview.badges" />
                    </div>
                </div>
                <div className={classes.metric}>
                    <div className={classes.metricValue}>{s.completedTasks}</div>
                    <div className={classes.metricLabel}>
                        <FormattedMessage id="pages.yearReview.missions" />
                    </div>
                </div>
                <div className={classes.metric}>
                    <div className={classes.metricValue}>
                        {s.curatorGratitudes + s.managerGratitudes}
                    </div>
                    <div className={classes.metricLabel}>
                        <FormattedMessage id="pages.yearReview.gratitudes" />
                    </div>
                </div>
            </div>
        </div>,
    ]

    if (data.specialThanks.includes("PODIUM")) {
        slides.push(
            <div key="podium">
                <div className={`${classes.badge} ${classes.goldBadge}`}>
                    <FormattedMessage id="pages.yearReview.podiumThanks" />
                </div>
                <p className={classes.big}>
                    #<span className={classes.bigAccent}>{s.currentRank}</span>
                </p>
                <h2 className={classes.title}>
                    <FormattedMessage id="pages.yearReview.podiumTitle" />
                </h2>
                <p className={classes.lead}>
                    <FormattedMessage id="pages.yearReview.podiumBody" />
                </p>
            </div>
        )
    } else if (data.specialThanks.includes("GRATITUDE")) {
        slides.push(
            <div key="gratitude">
                <div className={classes.badge}>
                    <FormattedMessage id="pages.yearReview.gratitudeThanks" />
                </div>
                <h2 className={classes.title}>
                    <FormattedMessage id="pages.yearReview.gratitudeTitle" />
                </h2>
                <p className={classes.lead}>
                    <FormattedMessage
                        id="pages.yearReview.gratitudeBody"
                        values={{
                            curator: s.curatorGratitudes,
                            manager: s.managerGratitudes,
                        }}
                    />
                </p>
            </div>
        )
    }

    slides.push(
        <div key="rank">
            <div className={classes.badge}>
                <FormattedMessage id="pages.yearReview.bestResult" />
            </div>
            <p className={classes.big}>
                #<span className={classes.bigAccent}>{s.bestRank ?? "—"}</span>
            </p>
            <h2 className={classes.title}>
                <FormattedMessage id="pages.yearReview.rankPlace" />
            </h2>
            <p className={classes.lead}>
                <FormattedMessage id="pages.yearReview.rankThanks" />
            </p>
        </div>
    )

    if (data.eligibility.eligible) {
        slides.push(
            <div key="super">
                <div className={`${classes.badge} ${classes.goldBadge}`}>
                    <FormattedMessage id="pages.yearReview.superBadge" />
                </div>
                <h2 className={classes.title}>
                    <FormattedMessage id="pages.yearReview.superTitle" />
                </h2>
                <div className={classes.reasons}>
                    {data.eligibility.reasons.map((r) => (
                        <span key={r} className={classes.reasonChip}>
                            {r}
                        </span>
                    ))}
                </div>
                <p className={classes.lead}>
                    <FormattedMessage id="pages.yearReview.superHint" />
                </p>
                {data.certificate && (
                    <p className={classes.lead}>
                        <FormattedMessage
                            id="pages.yearReview.alreadyIssued"
                            values={{ number: data.certificate.certificateNumber }}
                        />
                    </p>
                )}
            </div>
        )
    } else {
        slides.push(
            <div key="motivate">
                <div className={classes.badge}>
                    <FormattedMessage id="pages.yearReview.keepGoing" />
                </div>
                <h2 className={classes.title}>
                    <FormattedMessage id="pages.yearReview.motivateTitle" />
                </h2>
                <p className={classes.lead}>
                    {data.eligibility.remainingHint ||
                        intl.formatMessage({ id: "pages.yearReview.motivateFallback" })}
                </p>
                <p className={classes.lead}>
                    <FormattedMessage
                        id="pages.yearReview.criteriaProgress"
                        values={{
                            met: data.eligibility.criteriaMet,
                            need: data.eligibility.criteriaRequired,
                        }}
                    />
                </p>
            </div>
        )
    }

    return slides
}

export default YearReviewPage
