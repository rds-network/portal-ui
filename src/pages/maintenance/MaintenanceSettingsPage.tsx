import {
    Button,
    Checkbox,
    Flex,
    Loader,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
} from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ImpersonationApiService } from "src/shared/api/ImpersonationApiService"
import { MaintenanceApiService } from "src/shared/api/MaintenanceApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"

const UNLOCK_QUERY = "maintenance_unlock"

function toLocalInput(iso: string | null | undefined): string {
    if (!iso) return ""
    const d = dayjs(iso)
    return d.isValid() ? d.format("YYYY-MM-DDTHH:mm") : ""
}

function fromLocalInput(value: string): string | null {
    const trimmed = value.trim()
    if (!trimmed) return null
    const d = dayjs(trimmed)
    return d.isValid() ? d.toISOString() : null
}

export default function MaintenanceSettingsPage() {
    const navigate = useNavigate()
    const { user } = useContext(UserContext)
    const queryClient = useQueryClient()

    const [enabled, setEnabled] = useState(false)
    const [headline, setHeadline] = useState("")
    const [body, setBody] = useState("")
    const [launchLocal, setLaunchLocal] = useState("")
    const [regenerate, setRegenerate] = useState(false)

    setDocumentTitleByLocale("pages.maintenance.title")

    const { data: impersonation } = useQuery({
        queryKey: ["impersonation-status"],
        queryFn: () => ImpersonationApiService.status(),
        enabled: !!user,
    })

    const allowed =
        hasPermission(user, [UserGroup.ADMIN_SSO, UserGroup.ADMIN_VOLUNTEER]) ||
        !!impersonation?.canImpersonate ||
        user?.username?.toLowerCase() === "legkov777"

    useEffect(() => {
        if (user && impersonation && !allowed) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, impersonation, allowed, navigate])

    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-maintenance"],
        queryFn: () => MaintenanceApiService.getAdmin(),
        enabled: allowed,
    })

    useEffect(() => {
        if (!data) return
        setEnabled(data.enabled)
        setHeadline(data.headline ?? "")
        setBody(data.body ?? "")
        setLaunchLocal(toLocalInput(data.launchAt))
    }, [data])

    const previewUrl = useMemo(() => {
        const token = data?.bypassToken
        if (!token) return ""
        return `${window.location.origin}/#${UNLOCK_QUERY}=${encodeURIComponent(token)}`
    }, [data?.bypassToken])

    const { mutate: save, isPending } = useMutation({
        mutationFn: () =>
            MaintenanceApiService.putAdmin({
                enabled,
                headline,
                body,
                launchAt: fromLocalInput(launchLocal),
                regenerateBypassToken: regenerate,
            }),
        onSuccess: (next) => {
            setRegenerate(false)
            queryClient.setQueryData(["admin-maintenance"], next)
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.maintenance.saved" />
                    </Text>,
                    null
                )
            )
        },
    })

    const copyPreview = async () => {
        if (!previewUrl) return
        try {
            await navigator.clipboard.writeText(previewUrl)
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.maintenance.copied" />
                    </Text>,
                    null
                )
            )
        } catch {
            // ignore
        }
    }

    if (!allowed || isLoading) {
        return (
            <Flex justify="center" py="xl">
                <Loader />
            </Flex>
        )
    }

    if (isError) {
        return (
            <Text c="red">
                <FormattedMessage id="pages.maintenance.loadError" />
            </Text>
        )
    }

    return (
        <Stack maw={720} gap="md">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.maintenance.title" />
                </Title>
                <Text c="dimmed" size="sm">
                    <FormattedMessage id="pages.maintenance.hint" />
                </Text>
            </div>

            <Checkbox
                checked={enabled}
                onChange={(e) => setEnabled(e.currentTarget.checked)}
                label={<FormattedMessage id="pages.maintenance.enabled" />}
            />

            <TextInput
                label={<FormattedMessage id="pages.maintenance.headline" />}
                value={headline}
                maxLength={500}
                onChange={(e) => setHeadline(e.currentTarget.value)}
            />

            <Textarea
                label={<FormattedMessage id="pages.maintenance.body" />}
                value={body}
                minRows={5}
                maxLength={20000}
                onChange={(e) => setBody(e.currentTarget.value)}
            />

            <TextInput
                type="datetime-local"
                label={<FormattedMessage id="pages.maintenance.launchAt" />}
                description={<FormattedMessage id="pages.maintenance.launchHelp" />}
                value={launchLocal}
                onChange={(e) => setLaunchLocal(e.currentTarget.value)}
            />

            <Checkbox
                checked={regenerate}
                onChange={(e) => setRegenerate(e.currentTarget.checked)}
                label={<FormattedMessage id="pages.maintenance.regen" />}
            />

            {previewUrl ? (
                <Stack gap="xs" p="md" style={{ border: "1px solid var(--mantine-color-yellow-4)", borderRadius: 8 }}>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                        <FormattedMessage id="pages.maintenance.bypassLink" />
                    </Text>
                    <Text size="xs" ff="monospace" style={{ wordBreak: "break-all" }}>
                        {previewUrl}
                    </Text>
                    <Button size="xs" w="fit-content" onClick={() => void copyPreview()}>
                        <FormattedMessage id="pages.maintenance.copy" />
                    </Button>
                </Stack>
            ) : (
                <Text size="sm" c="dimmed">
                    <FormattedMessage id="pages.maintenance.noToken" />
                </Text>
            )}

            <Button loading={isPending} onClick={() => save()} w="fit-content">
                <FormattedMessage id="pages.maintenance.save" />
            </Button>
        </Stack>
    )
}
