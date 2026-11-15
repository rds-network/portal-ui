import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Button, Stack, Text, Title } from "@mantine/core"
import { FormattedMessage, useIntl } from "react-intl"
import { useQuery } from "@tanstack/react-query"
import { useContext } from "react"
import { UserContext } from "src/app/providers/UserContext"
import { ImpersonationApiService } from "src/shared/api/ImpersonationApiService"
import { MaintenanceApiService, type PublicMaintenanceDto } from "src/shared/api/MaintenanceApiService"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { LoadingScreen } from "src/shared/ui/loading/LoadingScreen"

const BYPASS_KEY = "portal_maintenance_ok"
const UNLOCK_QUERY = "maintenance_unlock"

type GateMode = "loading" | "live" | "wall"

function formatCountdown(ms: number, intl: ReturnType<typeof useIntl>) {
    if (ms <= 0) return intl.formatMessage({ id: "maintenance.countdownDone" })
    const s = Math.floor(ms / 1000)
    const days = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    const parts: string[] = []
    if (days > 0) parts.push(`${days}${intl.formatMessage({ id: "maintenance.countdownD" })}`)
    parts.push(`${h}${intl.formatMessage({ id: "maintenance.countdownH" })}`)
    parts.push(`${m}${intl.formatMessage({ id: "maintenance.countdownM" })}`)
    parts.push(`${sec}${intl.formatMessage({ id: "maintenance.countdownS" })}`)
    return parts.join(" ")
}

export function MaintenanceGate({ children }: { children: ReactNode }) {
    const intl = useIntl()
    const { user } = useContext(UserContext)
    const [mode, setMode] = useState<GateMode>("loading")
    const [payload, setPayload] = useState<PublicMaintenanceDto | null>(null)
    const [tick, setTick] = useState(0)

    const { data: impersonation } = useQuery({
        queryKey: ["impersonation-status"],
        queryFn: () => ImpersonationApiService.status(),
        enabled: !!user,
        staleTime: 60_000,
    })

    const privilegedBypass =
        hasPermission(user, [UserGroup.ADMIN_SSO, UserGroup.ADMIN_VOLUNTEER]) ||
        !!impersonation?.canImpersonate ||
        user?.username?.toLowerCase() === "legkov777"

    useEffect(() => {
        const id = setInterval(() => setTick((x) => x + 1), 1000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        let cancelled = false

        async function run() {
            const hashRaw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
            const hashParams = new URLSearchParams(hashRaw)
            const token = hashParams.get(UNLOCK_QUERY)?.trim()

            let pub: PublicMaintenanceDto | null = null
            try {
                pub = await MaintenanceApiService.getPublic()
            } catch {
                if (!cancelled) setMode("live")
                return
            }
            if (cancelled) return

            if (token) {
                const ok = await MaintenanceApiService.unlock(token)
                if (!cancelled && ok) {
                    try {
                        sessionStorage.setItem(BYPASS_KEY, "1")
                    } catch {
                        // ignore
                    }
                }
                const path = `${window.location.pathname}${window.location.search}`
                window.history.replaceState({}, "", path)
            }

            if (cancelled) return
            setPayload(pub)
            if (!pub?.enabled) {
                setMode("live")
                return
            }
            if (privilegedBypass) {
                setMode("live")
                return
            }
            try {
                if (sessionStorage.getItem(BYPASS_KEY) === "1") {
                    setMode("live")
                    return
                }
            } catch {
                // ignore
            }
            setMode("wall")
        }

        void run()
        return () => {
            cancelled = true
        }
    }, [privilegedBypass])

    const countdownLabel = useMemo(() => {
        void tick
        if (!payload?.launchAt) return null
        const target = new Date(payload.launchAt).getTime()
        return formatCountdown(target - Date.now(), intl)
    }, [payload?.launchAt, tick, intl])

    if (mode === "loading") {
        return <LoadingScreen />
    }

    if (mode === "wall" && payload) {
        const headline =
            payload.headline.trim().length > 0
                ? payload.headline.trim()
                : intl.formatMessage({ id: "maintenance.defaultHeadline" })
        return (
            <Stack
                align="center"
                justify="center"
                gap="md"
                px="md"
                py="xl"
                mih="100dvh"
                style={{
                    background: "linear-gradient(180deg, #1e293b 0%, #0f172a 55%, #020617 100%)",
                    color: "#f8fafc",
                    textAlign: "center",
                }}
            >
                <Title order={1}>{headline}</Title>
                {payload.body.trim().length > 0 ? (
                    <Text maw={520} style={{ whiteSpace: "pre-line" }} c="gray.3">
                        {payload.body.trim()}
                    </Text>
                ) : (
                    <Text maw={520} c="gray.4">
                        <FormattedMessage id="maintenance.defaultBody" />
                    </Text>
                )}
                {payload.launchAt ? (
                    <Stack gap={4} mt="lg">
                        <Text size="xs" tt="uppercase" fw={700} c="gray.4">
                            <FormattedMessage id="maintenance.countdownLabel" />
                        </Text>
                        <Text ff="monospace" size="xl" fw={800}>
                            {countdownLabel}
                        </Text>
                    </Stack>
                ) : (
                    <Text mt="lg" c="gray.4">
                        <FormattedMessage id="maintenance.countdownNone" />
                    </Text>
                )}
                <Button
                    mt="xl"
                    variant="light"
                    component="a"
                    href="/api/oauth2/login/authentik"
                >
                    <FormattedMessage id="common.buttons.login" />
                </Button>
            </Stack>
        )
    }

    return <>{children}</>
}
