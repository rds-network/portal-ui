import { Flex, Text } from "@mantine/core"
import { Dropzone, FileWithPath } from "@mantine/dropzone"
import { notifications } from "@mantine/notifications"
import { FileInfoDto } from "@rds-network/portal-api-axios"
import { IconFiles, IconUpload, IconX } from "@tabler/icons-react"
import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { ErrorCode, FileRejection } from "react-dropzone-esm"
import { FormattedMessage, useIntl } from "react-intl"
import { FilesApiService } from "src/shared/api/FilesApiService"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { locales } from "./constants"
import classes from "./FileUploader.module.scss"

interface FileUploaderProps {
    maxFiles?: number
    maxSize?: number
    files?: FileInfoDto[]
    onFilesUploaded?: (files: FileInfoDto[]) => void
    onFilesLoading?: (files: string[]) => void
}

export interface FileUploaderInterface {
    delete: (id: string) => void | undefined
}

export const FileUploader = forwardRef<FileUploaderInterface, FileUploaderProps>((props, ref) => {
    const intl = useIntl()

    const [loadingFiles, setLoadingFiles] = useState<string[]>([])
    const [uploadedFiles, setUploadedFiles] = useState<FileInfoDto[]>([])

    const maxSize = props.maxSize ?? 5 // MB
    const maxFiles = props.maxFiles ?? 7
    const currentCount = props.files?.length ?? 0
    const disabled = currentCount >= maxFiles

    useImperativeHandle(ref, () => ({
        delete: (id) => {
            props.onFilesUploaded?.(props.files?.filter((it) => it.id !== id) || [])
        },
    }))

    // Пробрасываем список «в процессе»
    useEffect(() => {
        if (props.onFilesLoading) {
            props.onFilesLoading(loadingFiles)
        }
    }, [loadingFiles])

    const onDrop = async (files: FileWithPath[]) => {
        // Проверка лимита
        if (currentCount + files.length > maxFiles) {
            notifications.show(
                ErrorNotification(
                    <Text size="sm">
                        <FormattedMessage id={locales.tooManyFiles} />
                    </Text>
                )
            )
            return
        }

        // показать прогресс: все имена в очереди
        setLoadingFiles(files.map((f) => f.name))
        // Инициализируем список загруженных файлов с текущими файлами
        setUploadedFiles(props.files || [])

        try {
            for (const file of files) {
                try {
                    // грузим по очереди, чтобы прогресс был предсказуем
                    const resp = await FilesApiService.uploadFile(file)
                    const fileInfo = resp.data
                    // Добавляем к локальному списку
                    setUploadedFiles((prev) => [...prev, fileInfo])
                } catch (e) {
                    // можно добавить уведомление об ошибке конкретного файла
                    // showError(file.name, intl.formatMessage({ id: `${locales.errors}.UploadFailed` }))
                } finally {
                    // снимаем файл из «в процессе»
                    setLoadingFiles((prev) => prev.filter((name) => name !== file.name))
                }
            }
        } finally {
            // на случай рассинхронизации
            setLoadingFiles([])
        }
    }

    // Уведомляем родителя о финальном списке файлов после завершения всех загрузок
    useEffect(() => {
        if (uploadedFiles.length > 0 && loadingFiles.length === 0) {
            props.onFilesUploaded?.(uploadedFiles)
            setUploadedFiles([]) // Сбрасываем локальное состояние
        }
    }, [uploadedFiles, loadingFiles])

    const onReject = (fileRejections: FileRejection[]) => {
        fileRejections.forEach((rej) => {
            const errorCode = rej.errors[0]?.code
            if (errorCode === ErrorCode.FileTooLarge) {
                showError(rej.file.name, intl.formatMessage({ id: `${locales.errors}.${errorCode}` }, { maxSize }))
            }
        })
    }

    const showError = (fileName: string, message: string) => {
        notifications.show(
            ErrorNotification(
                <Text fw="bold" size="sm">
                    {intl.formatMessage({ id: locales.fileName }, { fileName })}
                </Text>,
                <Text size="sm">{message}</Text>
            )
        )
    }

    return (
        <Dropzone
            onDrop={onDrop}
            onReject={onReject}
            disabled={disabled}
            maxSize={maxSize * 1024 ** 2}
            loading={loadingFiles.length !== 0}
        >
            <Flex justify="center" align="center" columnGap="md">
                <Dropzone.Accept>
                    <IconUpload className={`${classes.icon} ${classes.iconAccept}`} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                    <IconX className={`${classes.icon} ${classes.iconReject}`} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                    <IconFiles className={`${classes.icon} ${classes.iconIdle}`} />
                </Dropzone.Idle>

                <Flex className={classes.description}>
                    <Text className={classes.title}>
                        <FormattedMessage id={locales.title} />
                    </Text>
                    <Text className={classes.subTitle}>
                        <FormattedMessage id={locales.description} values={{ maxFiles, maxSize }} />
                    </Text>
                </Flex>
            </Flex>
        </Dropzone>
    )
})
