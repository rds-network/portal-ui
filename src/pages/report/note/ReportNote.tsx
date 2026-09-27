import { ActionIcon, Avatar, Flex, Paper, Text } from "@mantine/core"
import { NoteDto } from "@rds-network/portal-api-axios"
import { IconTrashX } from "@tabler/icons-react"
import dayjs from "dayjs"
import React, { useContext, useState } from "react"
import { FormattedMessage } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { locales } from "src/pages/report/lib/locales"
import { NoteApiService } from "src/shared/api/NoteApiService"
import { hasPermission, UserGroup } from "src/shared/user/roles"

interface ReportNoteProps {
    note: NoteDto
}

export const ReportNote = ({ note }: ReportNoteProps) => {
    const { user: currentUser } = useContext(UserContext)
    const [deleting, setDeleting] = useState(false)

    const onDelete = () => {
        setDeleting(true)
        NoteApiService.deleteNote(note.id).then((response) => {
            window.location.reload()
        })
    }

    return (
        <Paper shadow="md" radius="md" p="xs" key={note.id}>
            <Flex direction="column" rowGap="sm">
                <Flex align="center" columnGap="xs">
                    <Avatar size={20} />
                    <Text c="dimmed" size="sm">
                        <FormattedMessage id={locales.moderator} />
                    </Text>
                    <Text size="sm" c="dimmed">
                        {dayjs(note.createTime).format("HH:mm DD.MM.YYYY")}
                    </Text>
                    {hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER]) && (
                        <ActionIcon
                            color="red"
                            variant="light"
                            size="sm"
                            ms="auto"
                            loading={deleting}
                            disabled={deleting}
                            onClick={onDelete}
                        >
                            <IconTrashX size={14} />
                        </ActionIcon>
                    )}
                </Flex>
                <Text size="sm">{note.text}</Text>
            </Flex>
        </Paper>
    )
}
