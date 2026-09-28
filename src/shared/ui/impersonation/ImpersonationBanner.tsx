import { Button, Flex, Text } from "@mantine/core"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useContext } from "react"
import { FormattedMessage } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { ImpersonationApiService } from "src/shared/api/ImpersonationApiService"
import { UserApiService } from "src/shared/api/user/UserApiService"

export const ImpersonationBanner = () => {
    const { setUser } = useContext(UserContext)
    const queryClient = useQueryClient()

    const { data: status } = useQuery({
        queryKey: ["impersonation-status"],
        queryFn: () => ImpersonationApiService.status(),
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    })

    const { mutate: stop, isPending } = useMutation({
        mutationFn: async () => {
            await ImpersonationApiService.stop()
            const account = await UserApiService.getCurrentAccount()
            setUser(account.data)
            await queryClient.invalidateQueries()
        },
        onSuccess: () => {
            window.location.assign("/")
        },
    })

    if (!status?.active) return null

    const name = status.targetFullName || status.targetUsername || "…"

    return (
        <Flex
            align="center"
            justify="center"
            gap="md"
            wrap="wrap"
            px="md"
            py="xs"
            style={{
                position: "sticky",
                top: 0,
                zIndex: 200,
                background: "var(--mantine-color-yellow-3)",
                color: "var(--mantine-color-dark-9)",
                borderBottom: "1px solid var(--mantine-color-yellow-6)",
            }}
        >
            <Text size="sm" fw={600}>
                <FormattedMessage id="impersonation.banner" values={{ name }} />
            </Text>
            <Button size="compact-sm" variant="filled" color="dark" loading={isPending} onClick={() => stop()}>
                <FormattedMessage id="impersonation.exit" />
            </Button>
        </Flex>
    )
}
