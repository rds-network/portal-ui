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

const withPreviewType = (file: File): File => {
    if (file.type) return file
    const pdf = file.name.toLowerCase().endsWith(".pdf")
    return new File([file], file.name, { type: pdf ? "application/pdf" : "application/octet-stream" })
}

export const AttachmentPreview = ({ file, source }: { file: FileInfoDto; source?: File }) => {
    const [url, setUrl] = useState<string | null>(null)
    const [kind, setKind] = useState<"pdf" | "image" | "other" | "error" | "loading">("loading")

    useEffect(() => {
        let cancelled = false
        let objectUrl: string | null = null
        setUrl(null)
        setKind("loading")

        if (source) {
            const typed = withPreviewType(source)
            objectUrl = URL.createObjectURL(typed)
            setKind(previewKind(typed.name, typed.type))
            setUrl(objectUrl)
            return () => {
                if (objectUrl) URL.revokeObjectURL(objectUrl)
            }
        }

        ;(async () => {
            try {
                const response = await fetch(file.link)
                if (!response.ok) throw new Error(response.statusText)
                const blob = await response.blob()
                const typed = blob.type
                    ? blob
                    : new Blob([blob], {
                          type: file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : blob.type,
                      })
                objectUrl = URL.createObjectURL(typed)
                if (cancelled) {
                    URL.revokeObjectURL(objectUrl)
                    return
                }
                setKind(previewKind(file.name, typed.type))
                setUrl(objectUrl)
            } catch {
                if (!cancelled) {
                    setKind(file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "error")
                    setUrl(file.name.toLowerCase().endsWith(".pdf") ? file.link : null)
                }
            }
        })()
        return () => {
            cancelled = true
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [file.id, file.link, file.name, source])

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
