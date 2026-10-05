import { Button, Flex, Modal, Text, Textarea, TextInput } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import React, { useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import { InboxApiService } from "src/shared/api/InboxApiService"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"

type Props = {
    opened: boolean
    close: () => void
    recipients: { username: string; name: string }[]
    initialSubject?: string
    initialBody?: string
}

export const InboxNotifyModal: React.FC<Props> = ({
    opened,
    close,
    recipients,
    initialSubject = "Уведомление по отчётности",
    initialBody = "",
}) => {
    const queryClient = useQueryClient()
    const [subject, setSubject] = useState(initialSubject)
    const [body, setBody] = useState(initialBody)

    useEffect(() => {
        if (!opened) return
        setSubject(initialSubject)
        setBody(initialBody)
    }, [opened, initialSubject, initialBody])

    const { mutate, isPending } = useMutation({
        mutationFn: () =>
            InboxApiService.create({
                subject: subject.trim(),
                body: body.trim(),
                recipients: recipients.map((item) => item.username),
            }),
        onSuccess: () => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.messages.sent" />
                    </Text>,
                    null
                )
            )
            queryClient.invalidateQueries({ queryKey: ["inbox"] })
            queryClient.invalidateQueries({ queryKey: ["inbox-unread"] })
            close()
        },
    })

    return (
        <Modal opened={opened} onClose={close} title={<FormattedMessage id="pages.messages.notify" />} centered>
            <Flex direction="column" gap="sm">
                <Text size="sm" c="dimmed">
                    {recipients.map((item) => item.name).join(", ")}
                </Text>
                <TextInput
                    label={<FormattedMessage id="pages.messages.subject" />}
                    value={subject}
                    onChange={(event) => setSubject(event.currentTarget.value)}
                />
                <Textarea
                    label={<FormattedMessage id="pages.messages.body" />}
                    minRows={5}
                    value={body}
                    onChange={(event) => setBody(event.currentTarget.value)}
                />
                <Button
                    disabled={!subject.trim() || !body.trim() || recipients.length === 0}
                    loading={isPending}
                    onClick={() => mutate()}
                >
                    <FormattedMessage id="pages.messages.send" />
                </Button>
            </Flex>
        </Modal>
    )
}
