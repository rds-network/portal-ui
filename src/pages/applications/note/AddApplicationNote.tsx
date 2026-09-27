import { Button, Flex, Textarea } from "@mantine/core"
import { IconSend2 } from "@tabler/icons-react"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useIntl } from "react-intl"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { v4 as uuid } from "uuid"
import classes from "./AddApplicationNote.module.scss"

interface AddApplicationNoteProps {
    applicationId: string
    onNoteAdded: (note: any) => void
}

export const AddApplicationNote = ({ applicationId, onNoteAdded }: AddApplicationNoteProps) => {
    const intl = useIntl()
    const [noteText, setNoteText] = useState("")

    const addNoteMutation = useMutation({
        mutationFn: (noteData: { id: string; text: string }) =>
            PrivateApplicationApiService.addNoteToApplication(applicationId, noteData),
        onSuccess: (response, variables) => {
            setNoteText("")

            onNoteAdded(response.data)
        },
        onError: (error) => {
            console.error("Failed to add note:", error)
        },
    })

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSave()
        }
    }

    const handleSave = async () => {
        if (!noteText.trim()) return

        const noteData = {
            id: uuid(),
            text: noteText.trim(),
        }

        addNoteMutation.mutate(noteData)
    }

    return (
        <Flex gap="sm" align="end" className={classes.container}>
            <Textarea
                className={classes.textarea}
                placeholder={intl.formatMessage({
                    id: "pages.applications.add-note",
                })}
                autosize={true}
                minRows={2}
                maxRows={6}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={addNoteMutation.isPending}
            />

            <Button
                className={classes.sendButton}
                aria-label={intl.formatMessage({ id: "pages.applications.add-note" })}
                onClick={handleSave}
                loading={addNoteMutation.isPending}
                disabled={!noteText.trim() || addNoteMutation.isPending}
                size="sm"
            >
                <IconSend2 size={16} />
            </Button>
        </Flex>
    )
}
