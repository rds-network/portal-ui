import { Avatar, Flex, ScrollArea, Text } from "@mantine/core"
import { TaskDto, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconCalendar, IconClock, IconLink, IconLanguage } from "@tabler/icons-react"
import dayjs from "dayjs"
import React from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { getSpentTime } from "src/shared/report/timeSpent"
import {
    getTaskDisplayDescription,
    getTaskDisplayName,
    hasTaskTranslation,
} from "src/shared/taskTranslation/lib/taskTranslation"
import { FileButton } from "src/shared/ui/fileButton/FileButton"
import { ImagePreview } from "src/shared/ui/imagePreview/ImagePreview"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { locales } from "./constants"
import classes from "./TaskCard.module.scss"

interface TaskCardProps {
    task: TaskDto
    users: Record<string, UserInfoDto>
}

export const TaskCard = ({ task, users }: TaskCardProps) => {
    const intl = useIntl()
    const hasSerbianTranslation = hasTaskTranslation(task)
    const defaultName = getTaskDisplayName(task, false)
    const defaultDescription = getTaskDisplayDescription(task, false)
    const serbianName = getTaskDisplayName(task, true)
    const serbianDescription = getTaskDisplayDescription(task, true)

    return (
        <Flex className={classes.task}>
            <Flex className={classes.topArea}>
                <Text fw="bold" className={classes.name}>
                    {defaultName}
                </Text>
                <Flex className={classes.clock}>
                    <IconClock size={14} />
                    <Text size="sm">{getSpentTime(task.timeSpent, intl)}</Text>
                </Flex>
            </Flex>
            <Text c="dimmed" className={classes.taskDescription}>
                {defaultDescription}
            </Text>
            {hasSerbianTranslation && (
                <Flex className={classes.serbianTaskView}>
                    <Flex className={classes.serbianTaskViewLabelContainer}>
                        <IconLanguage size={16} />
                        <Text fw="bold" size="sm" className={classes.serbianTaskViewLabel}>
                            <FormattedMessage id={locales.serbianTaskView} />
                        </Text>
                    </Flex>

                    <Text fw="bold" className={classes.name}>
                        {serbianName}
                    </Text>
                    <Text c="dimmed" className={classes.taskDescription}>
                        {serbianDescription}
                    </Text>
                </Flex>
            )}
            <Flex className={classes.taskProperties}>
                <TextPropertyBox
                    name={locales.taskDate}
                    value={dayjs(task.date).format("DD MMM YYYY")}
                    icon={<IconCalendar size={16} />}
                />
                {task.customer && (
                    <TextPropertyBox
                        name={locales.taskCustomer}
                        href={`/profile/${task.customer}`}
                        icon={
                            <Avatar
                                src={users[task.customer || ""].avatar?.link}
                                name={users[task.customer || ""].fullName}
                                color="initials"
                                size={20}
                            />
                        }
                        value={users[task.customer || ""].fullName}
                    />
                )}
            </Flex>
            {task.result && (
                <TextPropertyBox
                    name={locales.taskResult}
                    value={task.result}
                    href={task.result}
                    icon={<IconLink size={16} />}
                    className={classes.taskResult}
                />
            )}
            {task.files?.length !== 0 && (
                <>
                    <Flex direction="column" gap={4}>
                        <Text c="dimmed" size="xs">
                            <FormattedMessage id={locales.taskFiles} />
                        </Text>
                        <Flex gap={8} wrap="wrap">
                            {task.files?.map((file) => (
                                <FileButton key={file.id} file={file} className={classes.fileButton} />
                            ))}
                        </Flex>
                    </Flex>
                    <ScrollArea type="auto" offsetScrollbars>
                        <Flex className={classes.imagePreviewContainer}>
                            {task.files
                                ?.filter((file) => {
                                    return isImageType(file.name)
                                })
                                .map((file) => (
                                    <ImagePreview link={file.link} className={classes.image} key={file.id} />
                                ))}
                        </Flex>
                    </ScrollArea>
                </>
            )}
        </Flex>
    )
}

const isImageType = (name: string): boolean => {
    const fileName = name.trim().toLowerCase()
    return (
        fileName.endsWith(".png") ||
        fileName.endsWith(".jpg") ||
        fileName.endsWith(".jpeg") ||
        fileName.endsWith(".heic") ||
        fileName.endsWith(".gif") ||
        fileName.endsWith(".webp") ||
        fileName.endsWith(".avif")
    )
}
