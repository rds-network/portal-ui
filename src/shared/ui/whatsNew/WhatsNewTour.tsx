import { Button, Text } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import React, { useCallback, useEffect, useLayoutEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useLocation, useNavigate } from "react-router"
import {
    WHATS_NEW_START_EVENT,
    WHATS_NEW_STEPS,
    WhatsNewStep,
    hasSeenWhatsNew,
    markWhatsNewSeen,
} from "./whatsNewConfig"
import classes from "./WhatsNewTour.module.scss"

const PAD = 6
const CARD_GAP = 12
const CARD_W = 360

type Rect = { top: number; left: number; width: number; height: number }

type Props = {
    blocked?: boolean
    onOpenNav?: () => void
    onCloseNav?: () => void
}

const measureTarget = (selector: string): Rect | null => {
    const el = document.querySelector(selector) as HTMLElement | null
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width < 2 && r.height < 2) return null
    return {
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
    }
}

const placeCard = (rect: Rect): React.CSSProperties => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cardH = 240
    const preferBelow = rect.top + rect.height + CARD_GAP + cardH < vh - 16
    const top = preferBelow
        ? rect.top + rect.height + CARD_GAP
        : Math.max(16, rect.top - cardH - CARD_GAP)
    const left = Math.min(Math.max(16, rect.left), vw - Math.min(CARD_W, vw - 32) - 16)
    return { top, left, transform: "none" }
}

export const WhatsNewTour: React.FC<Props> = ({ blocked = false, onOpenNav, onCloseNav }) => {
    const isMobile = useMediaQuery("(max-width: 768px)")
    const navigate = useNavigate()
    const location = useLocation()
    const [active, setActive] = useState(false)
    const [index, setIndex] = useState(0)
    const [rect, setRect] = useState<Rect | null>(null)

    const step: WhatsNewStep | undefined = WHATS_NEW_STEPS[index]

    const finish = useCallback(() => {
        markWhatsNewSeen()
        setActive(false)
        setIndex(0)
        setRect(null)
    }, [])

    const start = useCallback(() => {
        setIndex(0)
        setActive(true)
    }, [])

    const goNext = useCallback(() => {
        setIndex((i) => {
            if (i >= WHATS_NEW_STEPS.length - 1) {
                markWhatsNewSeen()
                setActive(false)
                setRect(null)
                return 0
            }
            return i + 1
        })
    }, [])

    useEffect(() => {
        const onStart = () => start()
        window.addEventListener(WHATS_NEW_START_EVENT, onStart)
        return () => window.removeEventListener(WHATS_NEW_START_EVENT, onStart)
    }, [start])

    useEffect(() => {
        if (blocked || hasSeenWhatsNew()) return
        const t = window.setTimeout(() => start(), 800)
        return () => window.clearTimeout(t)
    }, [blocked, start])

    // Navigate to step route when needed
    useEffect(() => {
        if (!active || !step?.route) return
        if (location.pathname !== step.route) {
            navigate(step.route)
        }
        if (!step.needsNav && isMobile) {
            onCloseNav?.()
        }
    }, [active, step, location.pathname, navigate, isMobile, onCloseNav])

    useLayoutEffect(() => {
        if (!active || !step) return

        let cancelled = false
        const needsRouteWait = !!step.route && location.pathname !== step.route
        const run = () => {
            if (cancelled) return
            if (!step.target) {
                setRect(null)
                return
            }
            if (step.needsNav && isMobile) {
                onOpenNav?.()
            }
            const next = measureTarget(step.target)
            setRect(next)
            if (next) {
                document.querySelector(step.target)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
            }
        }

        const delays = needsRouteWait
            ? [200, 450, 800, 1200]
            : step.needsNav && isMobile
              ? [120, 320, 600]
              : [40, 200, 450]
        const timers = delays.map((ms) => window.setTimeout(run, ms))

        const skipMs = needsRouteWait ? 1600 : step.needsNav && isMobile ? 900 : 700
        const skipTimer =
            step.target &&
            window.setTimeout(() => {
                if (cancelled) return
                // Optional highlights (e.g. remark) — skip if absent; required page anchors too
                if (!measureTarget(step.target!)) {
                    goNext()
                }
            }, skipMs)

        const onWin = () => run()
        window.addEventListener("resize", onWin)
        window.addEventListener("scroll", onWin, true)

        return () => {
            cancelled = true
            timers.forEach((t) => window.clearTimeout(t))
            if (skipTimer) window.clearTimeout(skipTimer)
            window.removeEventListener("resize", onWin)
            window.removeEventListener("scroll", onWin, true)
        }
    }, [active, step, isMobile, onOpenNav, goNext, location.pathname])

    if (!active || !step) return null

    const isLast = index >= WHATS_NEW_STEPS.length - 1
    const isFirst = index === 0
    const hasSpotlight = !!step.target && !!rect

    return (
        <div className={classes.overlay} role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
            {hasSpotlight ? (
                <div
                    className={classes.spotlight}
                    style={{
                        top: rect!.top,
                        left: rect!.left,
                        width: rect!.width,
                        height: rect!.height,
                    }}
                />
            ) : (
                <div className={classes.dim} />
            )}

            <div
                className={hasSpotlight ? classes.card : `${classes.card} ${classes.cardCentered}`}
                style={hasSpotlight ? placeCard(rect!) : undefined}
            >
                <Text className={classes.progress}>
                    {index + 1} / {WHATS_NEW_STEPS.length}
                </Text>
                <h3 id="whats-new-title" className={classes.title}>
                    <FormattedMessage id={step.titleId} />
                </h3>
                <p className={classes.body}>
                    <FormattedMessage id={step.bodyId} />
                </p>
                <div className={classes.actions}>
                    <Button variant="subtle" size="compact-sm" onClick={finish}>
                        <FormattedMessage id="whatsNew.skip" />
                    </Button>
                    <div className={classes.actionsRight}>
                        {!isFirst && (
                            <Button
                                variant="default"
                                size="compact-sm"
                                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                            >
                                <FormattedMessage id="whatsNew.back" />
                            </Button>
                        )}
                        <Button size="compact-sm" onClick={() => (isLast ? finish() : goNext())}>
                            <FormattedMessage id={isLast ? "whatsNew.finish" : "whatsNew.next"} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
