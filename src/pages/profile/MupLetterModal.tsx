import { Button, Flex, Modal, Text, TextInput, Textarea } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useEffect, useMemo, useState } from "react"
import { FormattedMessage } from "react-intl"
import { MupLetterApiService } from "src/shared/api/MupLetterApiService"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { MUP_TO, buildMupLetter } from "./mupLetter"

type Props = {
    opened: boolean
    close: () => void
    username: string
    fullName?: string
    passport?: string
    birthDate?: string
    address?: string
    phone?: string
    email?: string
}

export const MupLetterModal: React.FC<Props> = ({
    opened,
    close,
    username,
    fullName = "",
    passport = "",
    birthDate = "",
    address = "",
    phone = "",
    email = "",
}) => {
    const queryClient = useQueryClient()
    const fallback = useMemo(
        () => buildMupLetter({ fullName, passport, birthDate, address, phone, email }),
        [fullName, passport, birthDate, address, phone, email]
    )
    const [to, setTo] = useState(fallback.to)
    const [subject, setSubject] = useState(fallback.subject)
    const [body, setBody] = useState(fallback.body)

    const { data: draft } = useQuery({
        queryKey: ["mup-draft", username],
        queryFn: () => MupLetterApiService.draft(username),
        enabled: opened && !!username,
    })

    const { data: sent = [] } = useQuery({
        queryKey: ["mup-letters"],
        queryFn: () => MupLetterApiService.list(),
        enabled: opened,
    })

    useEffect(() => {
        setTo(fallback.to)
        setSubject(fallback.subject)
        setBody(fallback.body)
    }, [fallback, opened])

    useEffect(() => {
        if (!draft?.subject || !draft.body) return
        setTo(draft.to || MUP_TO)
        setSubject(draft.subject)
        setBody(draft.body)
    }, [draft])

    const { mutate, isPending } = useMutation({
        mutationFn: () =>
            MupLetterApiService.send({
                username,
                to,
                subject: subject.trim(),
                body: body.trim(),
            }),
        onSuccess: () => {
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.mup.sent" />
                    </Text>,
                    null
                )
            )
            queryClient.invalidateQueries({ queryKey: ["mup-letters"] })
        },
    })

    return (
        <Modal opened={opened} onClose={close} title={<FormattedMessage id="pages.mup.title" />} size="lg" centered>
            <Flex direction="column" gap="sm">
                <Text size="sm" c="dimmed">
                    <FormattedMessage id="pages.mup.hint" />
                </Text>
                <TextInput label={<FormattedMessage id="pages.mup.to" />} value={to} onChange={(e) => setTo(e.currentTarget.value)} />
                <TextInput
                    label={<FormattedMessage id="pages.mup.subject" />}
                    value={subject}
                    onChange={(e) => setSubject(e.currentTarget.value)}
                />
                <Textarea
                    label={<FormattedMessage id="pages.mup.body" />}
                    minRows={16}
                    value={body}
                    onChange={(e) => setBody(e.currentTarget.value)}
                />
                <Button loading={isPending} disabled={!subject.trim() || body.trim().length < 40} onClick={() => mutate()}>
                    <FormattedMessage id="pages.mup.send" />
                </Button>
                {sent.length > 0 && (
                    <div>
                        <Text fw={650} mt="sm">
                            <FormattedMessage id="pages.mup.history" />
                        </Text>
                        {sent.slice(0, 8).map((item) => (
                            <Text key={item.id} size="sm" mt={6}>
                                {dayjs(item.createTime).format("DD.MM.YYYY HH:mm")} · {item.status} · {item.subject}
                            </Text>
                        ))}
                    </div>
                )}
            </Flex>
        </Modal>
    )
}
