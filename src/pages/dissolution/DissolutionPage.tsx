import { Badge, Button, Card, Flex, Group, Loader, Text, Title } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { DissolutionRequestApiService } from "src/shared/api/DissolutionRequestApiService"
import { DeactivatedActiveContractDto, InboxApiService } from "src/shared/api/InboxApiService"
import { UserApiService } from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { formatContractEnd } from "src/shared/utils/latestContractEnd"
import { getFullAddress } from "src/shared/utils/getFullAddress"
import { MupLetterModal } from "src/pages/profile/MupLetterModal"
import classes from "./DissolutionPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER]

export const DissolutionPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const [mupOpened, { open: openMup, close: closeMup }] = useDisclosure(false)
    const [mupTarget, setMupTarget] = useState<DeactivatedActiveContractDto | null>(null)
    const [mupReason, setMupReason] = useState<"NON_COMPLIANCE" | "VOLUNTEER_REQUEST">("NON_COMPLIANCE")

    setDocumentTitleByLocale("pages.dissolution.title")

    useEffect(() => {
        if (!hasPermission(user, MANAGERS)) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, navigate])

    const { data: items = [], isLoading, isFetching } = useQuery({
        queryKey: ["report-overdue-deactivated"],
        queryFn: () => InboxApiService.deactivatedActiveContract(),
    })

    const { data: pendingRequests = [] } = useQuery({
        queryKey: ["dissolution-requests", "pending"],
        queryFn: () => DissolutionRequestApiService.pending(),
    })

    const { data: mupUser } = useQuery({
        queryKey: ["getInfo", mupTarget?.username],
        queryFn: () => UserApiService.getInfo(mupTarget!.username).then((r) => r.data),
        enabled: !!mupTarget?.username && mupOpened,
    })

    const openProfile = (username: string) => {
        navigate(`/profile/${encodeURIComponent(username)}`)
    }

    const openMupLetter = (
        item: DeactivatedActiveContractDto,
        reason: "NON_COMPLIANCE" | "VOLUNTEER_REQUEST" = "NON_COMPLIANCE"
    ) => {
        setMupReason(reason)
        setMupTarget(item)
        openMup()
    }

    const handleCloseMup = () => {
        closeMup()
        setMupTarget(null)
        setMupReason("NON_COMPLIANCE")
    }

    const mupCitizenship =
        mupUser?.residencePermits?.find((permit) => permit.nationality)?.nationality || ""

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.dissolution.title" />
                </Title>
                <Text c="dimmed" mt={6}>
                    <FormattedMessage id="pages.dissolution.description" />
                </Text>
            </div>

            {pendingRequests.length > 0 && (
                <Card withBorder p="md" radius="lg">
                    <Title order={4} mb="sm">
                        <FormattedMessage id="pages.dissolution.pendingRequests" />
                    </Title>
                    {pendingRequests.map((item) => (
                        <div key={item.id} className={classes.row}>
                            <div className={classes.meta}>
                                <Text fw={600}>{item.fullName || item.username}</Text>
                                <Text size="xs" c="dimmed">
                                    {item.username}
                                    {item.programCode ? ` · ${item.programCode}` : ""}
                                    {" · "}
                                    <FormattedMessage
                                        id="pages.dissolutionRequests.fromDateValue"
                                        values={{ date: dayjs(item.fromDate).format("DD.MM.YYYY") }}
                                    />
                                </Text>
                                {item.reason && (
                                    <Text size="xs" c="orange" mt={4}>
                                        {item.reason}
                                    </Text>
                                )}
                            </div>
                            <Group gap="xs" className={classes.actions}>
                                <Button size="compact-xs" variant="light" onClick={() => openProfile(item.username)}>
                                    <FormattedMessage id="pages.dissolution.openProfile" />
                                </Button>
                                <Button
                                    size="compact-xs"
                                    variant="outline"
                                    onClick={() =>
                                        openMupLetter(
                                            {
                                                accountId: 0,
                                                username: item.username,
                                                fullName: item.fullName || item.username,
                                                program: item.programCode || undefined,
                                            },
                                            "VOLUNTEER_REQUEST"
                                        )
                                    }
                                >
                                    <FormattedMessage id="pages.dissolution.mupLetter" />
                                </Button>
                            </Group>
                        </div>
                    ))}
                </Card>
            )}

            <Card withBorder p="md" radius="lg">
                <Text mb="md">
                    <FormattedMessage id="pages.dissolution.total" values={{ count: items.length }} />
                </Text>
                {(isLoading || isFetching) && items.length === 0 ? (
                    <Flex align="center" gap="sm" py="lg">
                        <Loader size="sm" />
                        <Text c="dimmed">
                            <FormattedMessage id="pages.dissolution.loading" />
                        </Text>
                    </Flex>
                ) : items.length === 0 ? (
                    <Text c="dimmed">
                        <FormattedMessage id="pages.dissolution.empty" />
                    </Text>
                ) : (
                    <div>
                        {items.map((item) => (
                            <div key={item.accountId} className={classes.row}>
                                <div className={classes.meta}>
                                    <div className={classes.person}>
                                        <Text fw={600}>{item.fullName}</Text>
                                        <Text size="xs" c="dimmed">
                                            {item.username}
                                            {item.program ? ` · ${item.program}` : ""}
                                            {item.contractType ? ` · ${item.contractType}` : ""}
                                            {formatContractEnd(item.contractEnd) && (
                                                <>
                                                    {" · "}
                                                    <FormattedMessage
                                                        id="pages.dissolution.contract"
                                                        values={{ date: formatContractEnd(item.contractEnd) }}
                                                    />
                                                </>
                                            )}
                                        </Text>
                                        {item.mupLetterSentAt && (
                                            <Badge color="grape" variant="light" size="sm" mt={4}>
                                                <FormattedMessage
                                                    id="pages.dissolution.mupNotified"
                                                    values={{
                                                        date: dayjs(item.mupLetterSentAt).format("DD.MM.YYYY"),
                                                    }}
                                                />
                                            </Badge>
                                        )}
                                        {item.deactivatedReason && (
                                            <Text size="xs" c="orange" mt={4}>
                                                <FormattedMessage
                                                    id="pages.dissolution.reason"
                                                    values={{ reason: item.deactivatedReason }}
                                                />
                                            </Text>
                                        )}
                                    </div>
                                    <Group gap="xs" className={classes.actions}>
                                        <Button
                                            size="compact-xs"
                                            variant="light"
                                            onClick={() => openProfile(item.username)}
                                        >
                                            <FormattedMessage id="pages.dissolution.openProfile" />
                                        </Button>
                                        {!item.mupLetterSentAt && (
                                            <Button
                                                size="compact-xs"
                                                variant="outline"
                                                onClick={() => openMupLetter(item)}
                                            >
                                                <FormattedMessage id="pages.dissolution.mupLetter" />
                                            </Button>
                                        )}
                                    </Group>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {mupTarget && (
                <MupLetterModal
                    opened={mupOpened}
                    close={handleCloseMup}
                    username={mupTarget.username}
                    fullName={mupUser?.fullName || mupTarget.fullName || ""}
                    birthDate={mupUser?.birthDate ? dayjs(mupUser.birthDate).format("DD.MM.YYYY") : ""}
                    citizenship={mupCitizenship}
                    address={
                        mupUser
                            ? getFullAddress(mupUser.postalCode, mupUser.city, mupUser.address)
                            : ""
                    }
                    phone={mupUser?.phone || ""}
                    email={mupUser?.email || ""}
                    initialReason={mupReason}
                />
            )}
        </Flex>
    )
}

export default DissolutionPage
