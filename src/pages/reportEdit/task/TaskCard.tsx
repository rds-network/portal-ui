import {
    ActionIcon,
    Badge,
    Flex,
    Loader,
    NumberInput,
    Pill,
    SimpleGrid,
    Text,
    Textarea,
    TextInput,
} from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm, zodResolver } from "@mantine/form"
import { FormValidationResult } from "@mantine/form/lib/types"
import { FileInfoDto, TaskDto } from "@rds-network/portal-api-axios"
import { IconCalendar, IconChecklist, IconClock, IconLanguage, IconLink, IconTrashX } from "@tabler/icons-react"
import dayjs from "dayjs"
import { createRef, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { locales } from "src/pages/reportEdit/task/lib/locales"
import {
    getTaskDisplayDescription,
    getTaskDisplayName,
    hasTaskTranslation,
} from "src/shared/taskTranslation/lib/taskTranslation"
import { FileUploader, FileUploaderInterface } from "src/shared/ui/fileUploader/FileUploader"
import { UserSearch } from "src/shared/ui/userSearch/UserSearch"
import { z } from "zod"
import classes from "./TaskCard.module.scss"

interface TaskCardProps {
    task: TaskDto
    index: number
    deletable: boolean
    editMode?: boolean
    onChange: (id: string, updatedTask: TaskDto) => void
    onDelete: (id: string) => void
}

export interface TaskCardInterface {
    validate: () => FormValidationResult
    getValues: () => TaskDto
    scrollIntoView: () => void
}

export const TaskCard = forwardRef<TaskCardInterface, TaskCardProps>((props, ref) => {
    const cardRef = useRef<HTMLDivElement>(null)

    const intl = useIntl()

    const editMode = props.editMode || false
    const hasSerbianTranslation = hasTaskTranslation(props.task)
    const serbianName = getTaskDisplayName(props.task, true)
    const serbianDescription = getTaskDisplayDescription(props.task, true)

    const requiredMessage = { message: intl.formatMessage({ id: locales.required }) }

    const validationSchema = z.object({
        name: z.string(requiredMessage).min(10, intl.formatMessage({ id: locales.minLetters }, { count: 10 })),
        description: z.string(requiredMessage).min(20, intl.formatMessage({ id: locales.minLetters }, { count: 20 })),
        result: z
            .string()
            .url(intl.formatMessage({ id: locales.invalidUrl }))
            .optional()
            .or(z.literal("")),
        timeSpent: z.number(requiredMessage).min(1),
        date: z.date(requiredMessage),
        customer: z.string().optional(),
    })

    const fileUploaderRef = createRef<FileUploaderInterface>()
    const [uploadedFiles, setUploadedFiles] = useState<FileInfoDto[]>([])
    const [loadingFiles, setLoadingFiles] = useState<String[]>([])

    const updateTaskTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const updateTask = () => {
        if (editMode) return

        const values = form.getValues()
        props.onChange(props.task.id, {
            id: props.task.id,
            name: values.name || "",
            description: values.description || "",
            nameSr: props.task.nameSr,
            descriptionSr: props.task.descriptionSr,
            result: values.result || "",
            timeSpent: values.timeSpent ? values.timeSpent * 60 : 0,
            date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : "",
            customer: values.customer || null,
            files: uploadedFiles,
        })
    }

    const form = useForm({
        mode: "uncontrolled",
        validate: zodResolver(validationSchema),
        initialValues: {
            name: props.task.name,
            description: props.task.description,
            result: props.task.result ? props.task.result : "",
            timeSpent: props.task.timeSpent ? props.task.timeSpent / 60 : null,
            date: props.task.date ? dayjs(props.task.date).toDate() : null,
            customer: props.task.customer,
        },
        onValuesChange: () => {
            if (editMode) return

            if (updateTaskTimeoutRef.current) {
                clearTimeout(updateTaskTimeoutRef.current)
            }
            updateTaskTimeoutRef.current = setTimeout(updateTask, 300)
        },
    })

    useImperativeHandle(ref, () => ({
        scrollIntoView: () => {
            cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        },
        validate: () => form.validate(),
        getValues: () => {
            const values = form.getValues()
            return {
                id: props.task.id,
                name: values.name.trim(),
                description: values.description.trim(),
                nameSr: props.task.nameSr,
                descriptionSr: props.task.descriptionSr,
                result: values.result,
                timeSpent: values.timeSpent ? values.timeSpent * 60 : 0,
                date: dayjs(values.date).format("YYYY-MM-DD"),
                customer: values.customer,
                files: uploadedFiles,
            }
        },
    }))

    useEffect(() => {
        if (props.task.files) {
            setUploadedFiles(props.task.files)
        }
    }, [])

    useEffect(() => {
        if (!editMode) {
            if (updateTaskTimeoutRef.current) {
                clearTimeout(updateTaskTimeoutRef.current)
            }
            updateTaskTimeoutRef.current = setTimeout(updateTask, 300)
        }
    }, [uploadedFiles, editMode])

    return (
        <Flex direction="column" className={classes.taskCard} ref={cardRef} key={props.task.id} rowGap={20}>
            <Flex className={classes.cardHeader}>
                <Badge size="lg" color="ocean" radius="md" variant="light" leftSection={<IconChecklist size={16} />}>
                    <FormattedMessage id={locales.task} values={{ index: props.index + 1 }} />
                </Badge>
                {props.deletable && (
                    <ActionIcon
                        aria-label={intl.formatMessage({ id: "design.taskDelete" })}
                        ml="auto"
                        size="lg"
                        variant="subtle"
                        color="red"
                        onClick={() => props.onDelete(props.task.id)}
                    >
                        <IconTrashX size={16} />
                    </ActionIcon>
                )}
            </Flex>
            <SimpleGrid cols={{ base: 1, sm: 2 }} className={classes.timeFields}>
                <NumberInput
                    min={1}
                    max={12}
                    mt="auto"
                    withAsterisk
                    suffix={intl.formatMessage({ id: locales.timeSpentSuffix })}
                    name="timeSpent"
                    key={form.key("timeSpent")}
                    {...form.getInputProps("timeSpent")}
                    label={<FormattedMessage id={locales.timeSpent} />}
                    description={<FormattedMessage id={locales.timeSpentDescription} />}
                    leftSection={<IconClock size={18} />}
                    inputWrapperOrder={["label", "description", "error", "input"]}
                />
                <DateInput
                    mt="auto"
                    name="date"
                    withAsterisk
                    valueFormat="DD MMM YYYY"
                    key={form.key("date")}
                    {...form.getInputProps("date")}
                    label={<FormattedMessage id={locales.taskDate} />}
                    description={<FormattedMessage id={locales.taskDateDescription} />}
                    minDate={dayjs(new Date()).subtract(1, "month").toDate()}
                    maxDate={new Date()}
                    leftSection={<IconCalendar size={18} />}
                    inputWrapperOrder={["label", "description", "error", "input"]}
                />
            </SimpleGrid>
            <TextInput
                name="name"
                withAsterisk
                key={form.key("name")}
                {...form.getInputProps("name")}
                label={<FormattedMessage id={locales.taskName} />}
            />
            <Textarea
                autosize
                minRows={3}
                maxRows={10}
                withAsterisk
                name="description"
                key={form.key("description")}
                {...form.getInputProps("description")}
                label={<FormattedMessage id={locales.taskDescription} />}
                description={<FormattedMessage id={locales.taskDescriptionDescription} />}
            />
            {editMode && hasSerbianTranslation && (
                <Flex className={classes.serbianTaskView}>
                    <Flex className={classes.serbianTaskViewLabelContainer}>
                        <IconLanguage size={16} />
                        <Text fw="bold" size="sm" className={classes.serbianTaskViewLabel}>
                            <FormattedMessage id={locales.serbianTaskViewLabel} />
                        </Text>
                    </Flex>
                    <Text fw={600} className={classes.serbianTaskViewName}>
                        {serbianName}
                    </Text>
                    <Text c="dimmed" className={classes.serbianTaskViewDescription}>
                        {serbianDescription}
                    </Text>
                </Flex>
            )}
            <TextInput
                name="result"
                key={form.key("result")}
                {...form.getInputProps("result")}
                label={<FormattedMessage id={locales.result} />}
                description={<FormattedMessage id={locales.resultDescription} />}
                leftSection={<IconLink size={18} />}
            />
            <UserSearch
                form={form}
                path="customer"
                label={<FormattedMessage id={locales.customer} />}
                description={<FormattedMessage id={locales.customerDescription} />}
                initialSearch={props.task.customer ? props.task.customer : undefined}
            />
            <FileUploader
                maxFiles={15}
                maxSize={5}
                ref={fileUploaderRef}
                files={uploadedFiles}
                onFilesUploaded={(files) => setUploadedFiles(files)}
                onFilesLoading={(files) => setLoadingFiles(files)}
            />
            {(uploadedFiles.length !== 0 || loadingFiles.length !== 0) && (
                <Flex className={classes.filesContainer} wrap="wrap">
                    {uploadedFiles.map((file) => {
                        return (
                            <Pill
                                key={file.id}
                                withRemoveButton
                                className={classes.filePill}
                                onRemove={() => fileUploaderRef.current?.delete(file.id)}
                            >
                                <Text className={classes.filePillText} truncate="end">
                                    {file.name}
                                </Text>
                            </Pill>
                        )
                    })}
                    {loadingFiles.map((file, index) => {
                        return (
                            <Pill key={index} className={classes.filePill}>
                                <Flex justify="center" align="center" columnGap={6}>
                                    <Text className={classes.filePillText} truncate="end" c="dimmed">
                                        {file}
                                    </Text>
                                    <Loader size={10} stroke="4" />
                                </Flex>
                            </Pill>
                        )
                    })}
                </Flex>
            )}
        </Flex>
    )
})
