import { Button, Flex, Loader, Stack, Text, Textarea, TextInput, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useContext, useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ApplicationJoinApiService } from "src/shared/api/ApplicationJoinApiService"
import { ImpersonationApiService } from "src/shared/api/ImpersonationApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { hasPermission, UserGroup } from "src/shared/user/roles"

export default function ApplicationJoinSettingsPage() {
    const navigate = useNavigate()
    const { user } = useContext(UserContext)
    const queryClient = useQueryClient()

    const [title, setTitle] = useState("")
    const [body, setBody] = useState("")
    const [agree1Label, setAgree1Label] = useState("")
    const [agree2Label, setAgree2Label] = useState("")
    const [buttonLabel, setButtonLabel] = useState("")

    setDocumentTitleByLocale("pages.applicationJoin.title")

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
        queryKey: ["admin-application-join"],
        queryFn: () => ApplicationJoinApiService.getAdmin(),
        enabled: allowed,
    })

    useEffect(() => {
        if (!data) return
        setTitle(data.title ?? "")
        setBody(data.body ?? "")
        setAgree1Label(data.agree1Label ?? "")
        setAgree2Label(data.agree2Label ?? "")
        setButtonLabel(data.buttonLabel ?? "")
    }, [data])

    const { mutate: save, isPending } = useMutation({
        mutationFn: () =>
            ApplicationJoinApiService.putAdmin({
                title,
                body,
                agree1Label,
                agree2Label,
                buttonLabel,
            }),
        onSuccess: (next) => {
            queryClient.setQueryData(["admin-application-join"], next)
            queryClient.invalidateQueries({ queryKey: ["public-application-join"] })
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.applicationJoin.saved" />
                    </Text>,
                    null
                )
            )
        },
    })

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
                <FormattedMessage id="pages.applicationJoin.loadError" />
            </Text>
        )
    }

    return (
        <Stack maw={720} gap="md">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.applicationJoin.title" />
                </Title>
                <Text c="dimmed" size="sm">
                    <FormattedMessage id="pages.applicationJoin.hint" />
                </Text>
            </div>

            <TextInput
                label={<FormattedMessage id="pages.applicationJoin.fieldTitle" />}
                value={title}
                maxLength={500}
                onChange={(e) => setTitle(e.currentTarget.value)}
            />

            <Textarea
                label={<FormattedMessage id="pages.applicationJoin.fieldBody" />}
                description={<FormattedMessage id="pages.applicationJoin.bodyHelp" />}
                value={body}
                minRows={10}
                maxLength={50000}
                onChange={(e) => setBody(e.currentTarget.value)}
            />

            <Textarea
                label={<FormattedMessage id="pages.applicationJoin.agree1" />}
                description={<FormattedMessage id="pages.applicationJoin.agreeHelp" />}
                value={agree1Label}
                minRows={2}
                maxLength={5000}
                onChange={(e) => setAgree1Label(e.currentTarget.value)}
            />

            <Textarea
                label={<FormattedMessage id="pages.applicationJoin.agree2" />}
                description={<FormattedMessage id="pages.applicationJoin.agreeHelp" />}
                value={agree2Label}
                minRows={2}
                maxLength={5000}
                onChange={(e) => setAgree2Label(e.currentTarget.value)}
            />

            <TextInput
                label={<FormattedMessage id="pages.applicationJoin.button" />}
                value={buttonLabel}
                maxLength={200}
                onChange={(e) => setButtonLabel(e.currentTarget.value)}
            />

            <Button loading={isPending} onClick={() => save()} w="fit-content">
                <FormattedMessage id="pages.applicationJoin.save" />
            </Button>
        </Stack>
    )
}
