import { ActionIcon, Avatar, Flex, Text } from "@mantine/core"
import { NoteDto, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconTrashX } from "@tabler/icons-react"
import { useMutation } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useContext } from "react"
import { useIntl } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { NoteApiService } from "src/shared/api/NoteApiService"
import classes from "./ApplicationNote.module.scss"

interface ApplicationNoteProps {
    note: NoteDto
    userInfo?: UserInfoDto
    onNoteDeleted: (noteId: string) => void
}

export const ApplicationNote = ({ note, userInfo, onNoteDeleted }: ApplicationNoteProps) => {
    const { user: currentUser } = useContext(UserContext)
    const intl = useIntl()

    const deleteNoteMutation = useMutation({
        mutationFn: () => NoteApiService.deleteNote(note.id),
        onSuccess: () => {
            // Уведомляем родительский компонент
            onNoteDeleted(note.id)
        },
        onError: (error) => {
            console.error("Failed to delete note:", error)
        },
    })

    const onDelete = () => {
        deleteNoteMutation.mutate()
    }

    return (
        <article className={classes.root}>
            <Flex direction="column" rowGap="sm">
                <Flex align="start" columnGap={10}>
                    <Avatar size={28} src={userInfo?.avatar?.link} name={userInfo?.fullName || note.createdBy} />
                    <div className={classes.metadata}>
                        <Text size="sm" fw={600}>
                            {userInfo?.fullName || note.createdBy}
                        </Text>
                        <Text size="xs" c="dimmed" mt={2}>
                            {dayjs(note.createTime).format("HH:mm DD.MM.YYYY")}
                        </Text>
                    </div>
                    {currentUser?.username === note.createdBy && (
                        <ActionIcon
                            color="red"
                            variant="subtle"
                            aria-label={intl.formatMessage({ id: "pages.applications.delete-comment" })}
                            size="sm"
                            ms="auto"
                            loading={deleteNoteMutation.isPending}
                            disabled={deleteNoteMutation.isPending}
                            onClick={onDelete}
                        >
                            <IconTrashX size={14} />
                        </ActionIcon>
                    )}
                </Flex>
                <Text size="sm" className={classes.body}>
                    {note.text}
                </Text>
            </Flex>
        </article>
    )
}
