import { Flex, Loader, Text } from "@mantine/core"
import { FileInfoDto } from "@rds-network/portal-api-axios"
import { useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import classes from "./EmailDrawer.module.scss"
import { locales } from "./lib/locales"

const previewKind = (name: string, type: string): "pdf" | "image" | "other" => {
    const lower = name.toLowerCase()
    if (type.includes("pdf") || lower.endsWith(".pdf")) return "pdf"
    if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(lower)) return "image"
    return "other"
}

export const AttachmentPreview = ({ file }: { file: FileInfoDto }) => {
    const [url, setUrl] = useState<string | null>(null)
    const [kind, setKind] = useState<"pdf" | "image" | "other" | "error" | "loading">("loading")

    useEffect(() => {
        let cancelled = false
        let objectUrl: string | null = null
        setUrl(null)
        setKind("loading")
        ;(async () => {
            try {
                const response = await fetch(file.link)
                if (!response.ok) throw new Error(response.statusText)
                const blob = await response.blob()
                objectUrl = URL.createObjectURL(blob)
                if (cancelled) {
                    URL.revokeObjectURL(objectUrl)
                    return
                }
                setKind(previewKind(file.name, blob.type))
                setUrl(objectUrl)
            } catch {
                if (!cancelled) setKind("error")
            }
        })()
        return () => {
            cancelled = true
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [file.id, file.link, file.name])

    return (
        <Flex className={classes.preview} direction="column" gap={8}>
            <div>
                <Text fw={600} size="sm">
                    <FormattedMessage id={locales.preview} />
                </Text>
                <Text size="xs" c="dimmed" truncate="end">
                    {file.name}
                </Text>
            </div>
            {kind === "loading" && (
                <Flex flex={1} align="center" justify="center">
                    <Loader size="sm" />
                </Flex>
            )}
            {kind === "error" && (
                <Text size="sm" c="dimmed">
                    <FormattedMessage id={locales.previewFail} />
                </Text>
            )}
            {kind === "other" && (
                <Text size="sm" c="dimmed">
                    <FormattedMessage id={locales.previewOther} />
                </Text>
            )}
            {kind === "pdf" && url && (
                <iframe className={classes.previewFrame} src={url} title={file.name} />
            )}
            {kind === "image" && url && <img className={classes.previewImage} src={url} alt={file.name} />}
        </Flex>
    )
}
