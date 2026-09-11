import { Button, ButtonVariant, MantineColor, MantineSize, Text } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { FileInfoDto } from "@rds-network/portal-api-axios"
import { IconDownload } from "@tabler/icons-react"
import React, { useState } from "react"
import { FormattedMessage } from "react-intl"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"

interface FileButtonProps {
    file: FileInfoDto
    className?: string
    color?: MantineColor
    size?: MantineSize
    variant?: ButtonVariant
    iconSize?: number
}

export const FileButton = ({ file, className, color, size, variant, iconSize }: FileButtonProps) => {
    const [loading, setLoading] = useState(false)

    const handleFileDownload = async () => {
        setLoading(true)
        try {
            // Fetch the file data
            const response = await fetch(file.link)
            if (!response.ok) {
                throw new Error(response.statusText)
            }

            // Convert the response into a Blob
            const blob = await response.blob()

            // Create a URL for the Blob and trigger download
            const link = document.createElement("a")
            link.href = URL.createObjectURL(blob)
            link.download = file.name // Set the desired file name
            document.body.appendChild(link)
            link.click()

            // Clean up the link element
            document.body.removeChild(link)
            URL.revokeObjectURL(link.href)
        } catch (error) {
            notifications.show(
                ErrorNotification(
                    <Text fw="bold" size="sm">
                        <FormattedMessage id="errors.file-download" />
                    </Text>,
                    <Text>{(error as Error).message}</Text>
                )
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            key={file.id}
            size={size || "xs"}
            variant={variant || "light"}
            color={color || "teal"}
            rightSection={<IconDownload size={iconSize || 14} />}
            className={className}
            loading={loading}
            disabled={loading}
            onClick={handleFileDownload}
        >
            {file.name}
        </Button>
    )
}
