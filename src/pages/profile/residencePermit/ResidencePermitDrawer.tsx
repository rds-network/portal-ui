import { Accordion, Button, Drawer, Flex, Group, Image, Modal, Text } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { ResidencePermitDto } from "@rds-network/portal-api-axios"
import { IconEye, IconPlus } from "@tabler/icons-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useContext, useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { UserApiService } from "src/shared/api/user/UserApiService"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { v4 as uuid } from "uuid"
import { locales } from "./lib/locales"
import { ResidencePermitForm } from "./ResidencePermitForm"

interface ResidencePermitDrawerProps {
    opened: boolean
    onClose: () => void
    userId: number
    residencePermits: ResidencePermitDto[]
    onSuccess?: () => void
}

export const ResidencePermitDrawer = ({
    opened,
    onClose,
    userId,
    residencePermits,
    onSuccess,
}: ResidencePermitDrawerProps) => {
    const queryClient = useQueryClient()
    const { user: currentUser } = useContext(UserContext)
    const [localPermits, setLocalPermits] = useState<ResidencePermitDto[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    useEffect(() => {
        if (opened) {
            setLocalPermits(residencePermits)
            setEditingId(null)
        }
    }, [opened, residencePermits])

    const canEdit = true

    const { mutate: savePermits } = useMutation({
        mutationFn: async (updatedPermits: ResidencePermitDto[]) => {
            return UserApiService.updateResidencePermits(userId, updatedPermits)
        },
        onSuccess: () => {
            notifications.show(SuccessNotification(<FormattedMessage id={locales.saved} />, null))
            queryClient.invalidateQueries({ queryKey: ["getInfo"] })
            if (onSuccess) onSuccess()
            onClose()
        },
        onError: () => {
            notifications.show(ErrorNotification(<FormattedMessage id={locales.saveError} />))
        },
    })

    const { mutate: deletePermit } = useMutation({
        mutationFn: async (permitId: string) => {
            return UserApiService.deleteResidencePermit(userId, permitId)
        },
        onSuccess: (_, permitId) => {
            setLocalPermits((prev) => prev.filter((p) => p.id !== permitId))
            notifications.show(SuccessNotification(<FormattedMessage id={locales.saved} />, null))
            queryClient.invalidateQueries({ queryKey: ["getInfo"] })
            if (onSuccess) onSuccess()
        },
        onError: () => {
            notifications.show(ErrorNotification(<FormattedMessage id={locales.saveError} />))
        },
    })

    const handleAdd = () => {
        const newPermit: ResidencePermitDto = {
            id: uuid(),
            nationality: "",
            registrationNumber: "",
            validUntil: "",
            purposeOfStay: "",
            identityNumber: "",
            issuingDate: "",
            issuingAuthority: "",
            stateOfBirth: "",
            note: "",
            frontSidePhoto: null,
            backSidePhoto: null,
        }
        setLocalPermits([...localPermits, newPermit])
        setEditingId(newPermit.id)
    }

    const handleUpdate = (updatedPermit: ResidencePermitDto) => {
        const newPermits = localPermits.map((p) => (p.id === updatedPermit.id ? updatedPermit : p))
        setLocalPermits(newPermits)
        savePermits(newPermits)
        setEditingId(null)
    }

    const handleDelete = (id: string) => {
        if (canEdit) {
            const isNew = !residencePermits.find((p) => p.id === id)
            if (isNew) {
                setLocalPermits(localPermits.filter((p) => p.id !== id))
                setEditingId(null)
            } else {
                deletePermit(id)
            }
        }
    }

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={<FormattedMessage id={locales.add} />}
            position="right"
            size="lg"
        >
            {editingId ? (
                (() => {
                    const permit = localPermits.find((p) => p.id === editingId)
                    if (!permit) return null
                    return (
                        <ResidencePermitForm
                            initialValues={permit}
                            onSubmit={handleUpdate}
                            onDelete={() => handleDelete(permit.id)}
                            canDelete={canEdit}
                            isNew={!residencePermits.find((p) => p.id === permit.id)}
                            onCancel={() => {
                                const isNew = !residencePermits.find((p) => p.id === editingId)
                                if (isNew) {
                                    setLocalPermits(localPermits.filter((p) => p.id !== editingId))
                                }
                                setEditingId(null)
                            }}
                        />
                    )
                })()
            ) : (
                <Flex direction="column" gap="md">
                    {localPermits.length === 0 ? (
                        <Text c="dimmed" ta="center" py="xl">
                            <FormattedMessage id={locales.noPermit} />
                        </Text>
                    ) : (
                        <Accordion variant="contained" defaultValue={localPermits[0].id}>
                            {localPermits.map((permit, index) => (
                                <Accordion.Item key={permit.id} value={permit.id}>
                                    <Accordion.Control>
                                        <Group justify="space-between">
                                            <Text fw={500}>
                                                <FormattedMessage id={locales.number} values={{ number: index + 1 }} />
                                            </Text>
                                            <Text size="sm" c="dimmed" me="sm">
                                                {permit.validUntil
                                                    ? dayjs(permit.validUntil).format("DD MMMM YYYY")
                                                    : ""}
                                            </Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Flex direction="column" gap="xs">
                                            <Text size="sm">
                                                <b>
                                                    <FormattedMessage id={locales.registrationNumberDescription} />:
                                                </b>{" "}
                                                {permit.registrationNumber}
                                            </Text>
                                            <Text size="sm">
                                                <b>
                                                    <FormattedMessage id={locales.identityNumberDescription} />:
                                                </b>{" "}
                                                {permit.identityNumber}
                                            </Text>
                                            <Text size="sm">
                                                <b>
                                                    <FormattedMessage id={locales.issuingDate} />:
                                                </b>{" "}
                                                {permit.issuingDate
                                                    ? dayjs(permit.issuingDate).format("DD.MM.YYYY")
                                                    : ""}
                                            </Text>
                                            <Text size="sm">
                                                <b>
                                                    <FormattedMessage id="pages.profile.residencePermit.valid-until" />:
                                                </b>{" "}
                                                {permit.validUntil ? dayjs(permit.validUntil).format("DD.MM.YYYY") : ""}
                                            </Text>
                                            <Flex gap="xs" mt="xs">
                                                {permit.frontSidePhoto?.link && (
                                                    <Button
                                                        variant="subtle"
                                                        size="xs"
                                                        color="gray"
                                                        leftSection={<IconEye size={16} />}
                                                        onClick={() =>
                                                            setPreviewImage(permit.frontSidePhoto?.link || null)
                                                        }
                                                    >
                                                        <FormattedMessage id="pages.profile.residencePermit.frontSidePhoto" />
                                                    </Button>
                                                )}
                                                {permit.backSidePhoto?.link && (
                                                    <Button
                                                        variant="subtle"
                                                        size="xs"
                                                        color="gray"
                                                        leftSection={<IconEye size={16} />}
                                                        onClick={() =>
                                                            setPreviewImage(permit.backSidePhoto?.link || null)
                                                        }
                                                    >
                                                        <FormattedMessage id="pages.profile.residencePermit.backSidePhoto" />
                                                    </Button>
                                                )}
                                            </Flex>
                                            {canEdit && (
                                                <Button
                                                    variant="light"
                                                    size="xs"
                                                    onClick={() => setEditingId(permit.id)}
                                                    fullWidth
                                                    mt="sm"
                                                >
                                                    <FormattedMessage id="pages.profile.buttons.edit" />
                                                </Button>
                                            )}
                                        </Flex>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    )}

                    {canEdit && (
                        <Button leftSection={<IconPlus size={16} />} onClick={handleAdd} variant="outline">
                            <FormattedMessage id="pages.profile.residencePermit.button" />
                        </Button>
                    )}
                </Flex>
            )}
            <Modal opened={!!previewImage} onClose={() => setPreviewImage(null)} size="auto" centered>
                {previewImage && <Image src={previewImage} style={{ maxHeight: "80vh" }} />}
            </Modal>
        </Drawer>
    )
}
