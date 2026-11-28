import { Button, Flex, Modal, Text, TextInput } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { UserInfoDto } from "@rds-network/portal-api-axios"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { MupLetterApiService } from "src/shared/api/MupLetterApiService"
import { UserAccountApiService } from "src/shared/api/user/UserApiService"
import { downloadMupApelPdf } from "src/shared/docs/fillMupTemplate"
import { getCityMupEntry, setCityMupEntry } from "src/shared/cityMupStore"
import { MUP_OFFICES } from "src/pages/resources/mup/mupOffices"
import { buildMupLetter } from "./mupLetter"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { getFullAddress } from "src/shared/utils/getFullAddress"

type Props = {
    opened: boolean
    close: () => void
    userInfo: UserInfoDto
    onSuccess: (updated: UserInfoDto) => void
}

export const DeactivateModal: React.FC<Props> = ({ opened, close, userInfo, onSuccess }) => {
    const { user: currentUser } = useContext(UserContext)
    const intl = useIntl()
    const queryClient = useQueryClient()

    const city = userInfo.city || ""
    const [mupName, setMupName] = useState("")
    const [mupEmail, setMupEmail] = useState("")
    const [notificationSent, setNotificationSent] = useState(false)

    useEffect(() => {
        if (!opened) return
        setNotificationSent(false)

        const saved = getCityMupEntry(city)
        if (saved) {
            setMupName(saved.mupName)
            setMupEmail(saved.mupEmail)
            return
        }

        const normalizedCity = city.trim().toLowerCase()
        const office = MUP_OFFICES.find(
            o =>
                o.citySr.toLowerCase() === normalizedCity ||
                o.cityRu.toLowerCase() === normalizedCity ||
                o.cityEn.toLowerCase() === normalizedCity
        )
        setMupName(office ? office.unitSr : "")
        setMupEmail(office ? office.email : "")
    }, [opened, city])

    const persistMupData = () => {
        if (city && currentUser?.username) {
            setCityMupEntry(city, { mupName: mupName.trim(), mupEmail: mupEmail.trim() }, currentUser.username)
        }
    }

    const { data: draft } = useQuery({
        queryKey: ["mup-draft", userInfo.username, "NON_COMPLIANCE"],
        queryFn: () => MupLetterApiService.draft(userInfo.username, "NON_COMPLIANCE"),
        enabled: opened && !!userInfo.username,
    })

    const hasMupName = mupName.trim().length > 0
    const hasMupEmail = mupEmail.trim().length > 0

    const invalidateAfterAction = () =>
        Promise.all([
            queryClient.invalidateQueries({ queryKey: ["getInfo", userInfo.username] }),
            queryClient.invalidateQueries({ queryKey: ["dissolution-queue"] }),
            queryClient.invalidateQueries({ queryKey: ["report-overdue"] }),
        ])

    const { mutate: enqueue, isPending: enqueuing } = useMutation({
        mutationFn: () => UserAccountApiService.enqueueDissolution(userInfo.id),
        onSuccess: (updated) => {
            persistMupData()
            onSuccess(updated)
            void invalidateAfterAction()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.dissolutionQueuedDone" />
                    </Text>,
                    null
                )
            )
            close()
        },
    })

    const { mutate: enqueueAndDownload, isPending: enqueueingAndDownloading } = useMutation({
        mutationFn: async () => {
            const updated = await UserAccountApiService.enqueueDissolution(userInfo.id)
            await downloadMupApelPdf({
                username: userInfo.username,
                fullName: userInfo.fullName,
                phone: userInfo.phone,
                birthDate: userInfo.birthDate,
                gender: userInfo.gender as string | undefined,
                postalCode: userInfo.postalCode,
                city: userInfo.city,
                address: userInfo.address,
                passport: draft?.passport,
            })
            return updated
        },
        onSuccess: (updated) => {
            persistMupData()
            onSuccess(updated)
            void invalidateAfterAction()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.dissolutionQueuedDone" />
                    </Text>,
                    null
                )
            )
            close()
        },
    })

    const { mutate: sendNotification, isPending: sendingNotification } = useMutation({
        mutationFn: async () => {
            const citizenship =
                (userInfo as UserInfoDto & { residencePermits?: { nationality?: string }[] })
                    ?.residencePermits?.find(p => p.nationality)?.nationality ?? ""
            const fallback = buildMupLetter({
                fullName: userInfo.fullName || "",
                passport: draft?.passport || "",
                birthDate: userInfo.birthDate ? dayjs(userInfo.birthDate).format("DD.MM.YYYY") : "",
                citizenship,
                address: getFullAddress(userInfo.postalCode, userInfo.city, userInfo.address),
                phone: userInfo.phone || "",
                email: userInfo.email || "",
            })
            return MupLetterApiService.send({
                username: userInfo.username,
                to: mupEmail.trim(),
                subject: draft?.subject || fallback.subject,
                body: draft?.body || fallback.body,
                reason: "NON_COMPLIANCE",
            })
        },
        onSuccess: () => {
            persistMupData()
            setNotificationSent(true)
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.deactivateModal.sentSuccess" />
                    </Text>,
                    null
                )
            )
            void queryClient.invalidateQueries({ queryKey: ["getInfo", userInfo.username] })
            void queryClient.invalidateQueries({ queryKey: ["mup-letters"] })
        },
    })

    const anyPending = enqueuing || enqueueingAndDownloading || sendingNotification

    return (
        <Modal
            opened={opened}
            onClose={close}
            title={<FormattedMessage id="pages.profile.deactivateModal.title" />}
            centered
        >
            <Flex direction="column" gap="sm">
                <Text size="sm" c="dimmed">
                    <FormattedMessage id="pages.profile.deactivateModal.city" />
                    {": "}
                    <Text span fw={600} c="default">
                        {city || "—"}
                    </Text>
                </Text>

                <TextInput
                    label={<FormattedMessage id="pages.profile.deactivateModal.mupName" />}
                    placeholder={intl.formatMessage({ id: "pages.profile.deactivateModal.mupNamePlaceholder" })}
                    value={mupName}
                    onChange={e => setMupName(e.currentTarget.value)}
                    onBlur={persistMupData}
                />
                <TextInput
                    label={<FormattedMessage id="pages.profile.deactivateModal.mupEmail" />}
                    placeholder={intl.formatMessage({ id: "pages.profile.deactivateModal.mupEmailPlaceholder" })}
                    value={mupEmail}
                    onChange={e => setMupEmail(e.currentTarget.value)}
                    onBlur={persistMupData}
                />

                <Flex direction="column" gap="xs" mt="xs">
                    <Button
                        variant="outline"
                        color="red"
                        loading={enqueuing}
                        disabled={enqueueingAndDownloading || sendingNotification}
                        onClick={() => enqueue()}
                    >
                        <FormattedMessage id="pages.profile.deactivateModal.deactivateOnly" />
                    </Button>
                    <Button
                        variant="outline"
                        color="orange"
                        loading={enqueueingAndDownloading}
                        disabled={!hasMupName || enqueuing || sendingNotification}
                        onClick={() => enqueueAndDownload()}
                    >
                        <FormattedMessage id="pages.profile.deactivateModal.deactivateAndDownload" />
                    </Button>
                    <Button
                        variant="outline"
                        color="blue"
                        loading={sendingNotification}
                        disabled={!hasMupName || !hasMupEmail || anyPending || notificationSent}
                        onClick={() => sendNotification()}
                    >
                        <FormattedMessage id="pages.profile.deactivateModal.deactivateAndSend" />
                    </Button>
                </Flex>
            </Flex>
        </Modal>
    )
}
