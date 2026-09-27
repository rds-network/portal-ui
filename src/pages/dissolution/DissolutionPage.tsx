import { Badge, Button, Card, Flex, Group, Loader, Text, Title } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { DissolutionRequestApiService } from "src/shared/api/DissolutionRequestApiService"
import {
    DeactivatedActiveContractDto,
    DissolutionQueueDto,
    InboxApiService,
} from "src/shared/api/InboxApiService"
import { UserAccountApiService, UserApiService } from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { formatContractEnd } from "src/shared/utils/latestContractEnd"
import { getFullAddress } from "src/shared/utils/getFullAddress"
import { MupLetterModal } from "src/pages/profile/MupLetterModal"
import classes from "./DissolutionPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_VOLUNTEER, UserGroup.MAIN_VOLUNTEER, UserGroup.ADMIN_SSO]

type MupTarget = {
    username: string
    fullName: string
}

export const DissolutionPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [mupOpened, { open: openMup, close: closeMup }] = useDisclosure(false)
    const [mupTarget, setMupTarget] = useState<MupTarget | null>(null)
    const [mupReason, setMupReason] = useState<"NON_COMPLIANCE" | "VOLUNTEER_REQUEST">("NON_COMPLIANCE")

    setDocumentTitleByLocale("pages.dissolution.title")

    useEffect(() => {
        if (!hasPermission(user, MANAGERS)) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, navigate])

    const { data: queue = [], isLoading, isFetching } = useQuery({
        queryKey: ["dissolution-queue"],
        queryFn: () => InboxApiService.dissolutionQueue(),
    })

    const { data: candidates = [] } = useQuery({
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

    const { mutate: dequeue, isPending: dequeueing } = useMutation({
        mutationFn: (accountId: number) => UserAccountApiService.dequeueDissolution(accountId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dissolution-queue"] })
            queryClient.invalidateQueries({ queryKey: ["report-overdue-deactivated"] })
            queryClient.invalidateQueries({ queryKey: ["report-overdue"] })
        },
    })

    const openProfile = (username: string) => {
        navigate(`/profile/${encodeURIComponent(username)}`)
    }

    const openMupLetter = (
        item: MupTarget,
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
        queryClient.invalidateQueries({ queryKey: ["dissolution-queue"] })
        queryClient.invalidateQueries({ queryKey: ["report-overdue-deactivated"] })
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
                                                username: item.username,
                                                fullName: item.fullName || item.username,
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
                <Title order={4} mb="sm">
                    <FormattedMessage id="pages.dissolution.queueTitle" />
                </Title>
                <Text mb="md">
                    <FormattedMessage id="pages.dissolution.total" values={{ count: queue.length }} />
                </Text>
                {(isLoading || isFetching) && queue.length === 0 ? (
                    <Flex align="center" gap="sm" py="lg">
                        <Loader size="sm" />
                        <Text c="dimmed">
                            <FormattedMessage id="pages.dissolution.loading" />
                        </Text>
                    </Flex>
                ) : queue.length === 0 ? (
                    <Text c="dimmed">
                        <FormattedMessage id="pages.dissolution.empty" />
                    </Text>
                ) : (
                    <div>
                        {queue.map((item) => (
                            <QueueRow
                                key={item.accountId}
                                item={item}
                                dequeueing={dequeueing}
                                onProfile={() => openProfile(item.username)}
                                onMup={() => openMupLetter(item)}
                                onDequeue={() => dequeue(item.accountId)}
                            />
                        ))}
                    </div>
                )}
            </Card>

            {candidates.length > 0 && (
                <Card withBorder p="md" radius="lg">
                    <Title order={4} mb="sm">
                        <FormattedMessage id="pages.dissolution.candidatesTitle" />
                    </Title>
                    <Text size="sm" c="dimmed" mb="md">
                        <FormattedMessage id="pages.dissolution.candidatesHint" />
                    </Text>
                    <div>
                        {candidates.map((item) => (
                            <CandidateRow
                                key={item.accountId}
                                item={item}
                                onProfile={() => openProfile(item.username)}
                                onMup={() => openMupLetter(item)}
                            />
                        ))}
                    </div>
                </Card>
            )}

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

const QueueRow: React.FC<{
    item: DissolutionQueueDto
    dequeueing: boolean
    onProfile: () => void
    onMup: () => void
    onDequeue: () => void
}> = ({ item, dequeueing, onProfile, onMup, onDequeue }) => (
    <div className={classes.row}>
        <div className={classes.meta}>
            <div className={classes.person}>
                <Group gap="xs">
                    <Text fw={600}>{item.fullName}</Text>
                    <Badge size="sm" color={item.active ? "teal" : "red"} variant="light">
                        <FormattedMessage
                            id={item.active ? "pages.dissolution.active" : "pages.dissolution.deactivated"}
                        />
                    </Badge>
                </Group>
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
                {item.dissolutionQueuedAt && (
                    <Badge color="orange" variant="light" size="sm" mt={4}>
                        <FormattedMessage
                            id="pages.dissolution.queuedAt"
                            values={{
                                date: dayjs(item.dissolutionQueuedAt).format("DD.MM.YYYY"),
                                by: item.dissolutionQueuedBy || "—",
                            }}
                        />
                    </Badge>
                )}
                {item.dissolutionQueueReason && (
                    <Text size="xs" c="orange" mt={4}>
                        <FormattedMessage
                            id="pages.dissolution.reason"
                            values={{ reason: item.dissolutionQueueReason }}
                        />
                    </Text>
                )}
            </div>
            <Group gap="xs" className={classes.actions}>
                <Button size="compact-xs" variant="light" onClick={onProfile}>
                    <FormattedMessage id="pages.dissolution.openProfile" />
                </Button>
                <Button size="compact-xs" variant="outline" onClick={onMup}>
                    <FormattedMessage id="pages.dissolution.mupLetter" />
                </Button>
                <Button size="compact-xs" variant="subtle" color="gray" loading={dequeueing} onClick={onDequeue}>
                    <FormattedMessage id="pages.dissolution.dequeue" />
                </Button>
            </Group>
        </div>
    </div>
)

const CandidateRow: React.FC<{
    item: DeactivatedActiveContractDto
    onProfile: () => void
    onMup: () => void
}> = ({ item, onProfile, onMup }) => (
    <div className={classes.row}>
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
                            values={{ date: dayjs(item.mupLetterSentAt).format("DD.MM.YYYY") }}
                        />
                    </Badge>
                )}
            </div>
            <Group gap="xs" className={classes.actions}>
                <Button size="compact-xs" variant="light" onClick={onProfile}>
                    <FormattedMessage id="pages.dissolution.openProfile" />
                </Button>
                {!item.mupLetterSentAt && (
                    <Button size="compact-xs" variant="outline" onClick={onMup}>
                        <FormattedMessage id="pages.dissolution.mupLetter" />
                    </Button>
                )}
            </Group>
        </div>
    </div>
)

export default DissolutionPage
