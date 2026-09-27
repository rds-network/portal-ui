import { Avatar, Badge, Flex, Text } from "@mantine/core"
import { ReportDto, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconCalendar, IconClock, IconUserStar } from "@tabler/icons-react"
import dayjs from "dayjs"
import React from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { getReportStatusColor } from "src/shared/report/status"
import { getSpentTime, getSpentTimeFromReport } from "src/shared/report/timeSpent"
import { getTaskDisplayDescription, getTaskDisplayName } from "src/shared/taskTranslation/lib/taskTranslation"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./ReportCard.module.scss"

const getReportFilesCount = (report: ReportDto): number =>
    (report.tasks || []).reduce((count, task) => count + (task.files?.length || 0), 0)

type Props = {
    report: ReportDto
    creator: UserInfoDto
    moderator?: UserInfoDto | null
    programName: string
    projectName: string
    currentUser: UserInfoDto | null
    onOpen: () => void
    hideVolunteer?: boolean
}

export const ReportCard: React.FC<Props> = ({
    report,
    creator,
    moderator,
    programName,
    projectName,
    currentUser,
    onOpen,
    hideVolunteer = false,
}) => {
    const intl = useIntl()
    const createTime = dayjs(report.createTime).format("DD MMM YYYY - HH:mm")
    const timeSpent = getSpentTimeFromReport(report, intl)
    const filesCount = getReportFilesCount(report)
    const weekLabel = intl.formatMessage({ id: "pages.report-list.week-short" }, { week: report.week })
    const tasksLabel = intl.formatMessage(
        { id: "pages.report-list.task-count" },
        { count: report.tasks?.length || 0 }
    )
    const filesLabel =
        filesCount > 0
            ? intl.formatMessage({ id: "pages.report-list.files-count" }, { count: filesCount })
            : null
    const showModerator =
        hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER]) && !!report.moderator && !!moderator

    return (
        <button type="button" className={classes.reportCard} onClick={onOpen}>
            <Flex className={classes.cardTop}>
                <Badge color={getReportStatusColor(report.status)} radius="md" variant="light">
                    <FormattedMessage id={`common.report-status.${report.status}`} />
                </Badge>
                <Text size="sm" c="dimmed">
                    {weekLabel}
                </Text>
                <Text size="sm" c="dimmed">
                    {tasksLabel}
                    {filesLabel ? ` · ${filesLabel}` : ""}
                </Text>
            </Flex>
            <Flex className={classes.cardHeader}>
                {!hideVolunteer && (
                    <TextPropertyBox
                        name="pages.report-list.volunteer"
                        value={creator.fullName}
                        icon={
                            <Avatar
                                src={creator.avatar?.link}
                                name={creator.fullName}
                                color="initials"
                                size={20}
                            />
                        }
                    />
                )}
                <TextPropertyBox
                    name="pages.report-list.creation-date"
                    value={createTime}
                    icon={<IconCalendar size={16} />}
                />
                <TextPropertyBox
                    name="pages.report-list.time-spent"
                    value={timeSpent}
                    icon={<IconClock size={16} />}
                />
                <TextPropertyBox name="pages.report-list.program" value={programName} />
                <TextPropertyBox name="pages.report-list.project" value={projectName} />
                {showModerator && (
                    <TextPropertyBox
                        name="pages.report.moderator-short"
                        value={moderator.fullName}
                        icon={<IconUserStar size={16} />}
                    />
                )}
            </Flex>
            <div className={classes.taskPreview}>
                {(report.tasks || []).map((task, i) => {
                    const name = getTaskDisplayName(task, false) || "—"
                    const hours = getSpentTime(task.timeSpent, intl)
                    const description = getTaskDisplayDescription(task, false)
                    return (
                        <Text key={task.id || i} className={classes.taskLine}>
                            {name} — {hours}
                            {description ? ` · ${description}` : ""}
                        </Text>
                    )
                })}
            </div>
        </button>
    )
}
