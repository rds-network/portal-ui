import { Avatar, Badge, Flex, Text, Tooltip, UnstyledButton } from "@mantine/core"
import { ApplicationDto, ContractDto, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconCalendar, IconMail, IconMessageCircle } from "@tabler/icons-react"
import dayjs from "dayjs"
import { MouseEvent, ReactNode } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useNavigate } from "react-router"
import { ContractDate } from "src/pages/applications/contract/ContractDate"
import { ApplicationMenu } from "src/pages/applications/menu/ApplicationMenu"
import { useApplicationUpdate } from "src/shared/api/applications/useApplicationUpdate"
import { ApplicationAssigneeAvatar } from "../assignee/ApplicationAssigneeAvatar"
import { ApplicationAssigneeSelect } from "../assignee/ApplicationAssigneeSelect"
import { CopyText } from "src/shared/ui/copyText/CopyText"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { ApplicationStatusSelect } from "src/shared/ui/select/ApplicationStatusSelect"
import { ApplicationStatus, getApplicationStatusColor } from "src/shared/user/applications"
import classes from "./ApplicationRow.module.scss"
import { ApplicationStatusReason } from "./ApplicationStatusReason"

const NOTES_PREVIEW_LIMIT = 3

interface ApplicationRowProps {
    applicationDto: ApplicationDto
    /** @deprecated always card layout */
    isMobile?: boolean
    assigneeUser?: UserInfoDto
}

export const ApplicationRow = ({ applicationDto: application, assigneeUser }: ApplicationRowProps) => {
    const navigate = useNavigate()
    const intl = useIntl()
    const { mutate: updateApplication, isPending: isUpdating } = useApplicationUpdate()

    const applicationPath = `/application/${application.id}`
    const notesCount = application.notes?.length || 0
    const sortedNotes = [...(application.notes || [])]
        .sort((a, b) => dayjs(b.createTime || 0).valueOf() - dayjs(a.createTime || 0).valueOf())
        .slice(0, NOTES_PREVIEW_LIMIT)
    const notesLabel = intl.formatMessage(
        { id: "pages.applications.notesCount", defaultMessage: "Комментарии: {count}" },
        { count: notesCount }
    )
    const notesCounter = notesCount > 0 && (
        <Tooltip label={notesLabel} withArrow>
            <UnstyledButton
                component={Link}
                to={applicationPath}
                className={classes.notesCounter}
                aria-label={notesLabel}
                data-row-action
            >
                <IconMessageCircle size={17} stroke={1.6} aria-hidden="true" />
                <span>{notesCount > 99 ? "99+" : notesCount}</span>
            </UnstyledButton>
        </Tooltip>
    )

    const onCardClick = (event: MouseEvent<HTMLElement>) => {
        const target = event.target as Element
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            !event.currentTarget.contains(target) ||
            target.closest(
                'a, button, input, select, textarea, label, [role="button"], [role="menuitem"], [role="option"], [role="combobox"], [tabindex], [data-row-action]'
            ) ||
            window.getSelection()?.toString()
        )
            return
        navigate(applicationPath)
    }

    const onStatusUpdate = (status: string, comment?: string) => {
        if (status === application.status) return
        updateApplication({
            id: application.id,
            status,
            ...(status === ApplicationStatus.DENY && comment ? { refuseReason: comment } : {}),
            ...(status === ApplicationStatus.PAUSED && comment ? { comment } : {}),
        })
    }

    const onContractChanged = (contract: ContractDto) => {
        updateApplication({ id: application.id, contract })
    }

    const statusReason =
        application.status === ApplicationStatus.PAUSED
            ? application.comment
            : application.status === ApplicationStatus.DENY
              ? application.refuseReason
              : undefined
    const reasonLabel = intl.formatMessage({
        id:
            application.status === ApplicationStatus.PAUSED
                ? "pages.applications.view.pause-reason"
                : "pages.applications.view.refuse-reason",
    })
    const statusControl = (
        <div className={classes.statusControl} data-row-action>
            <div className={classes.statusField}>
                <ApplicationStatusSelect application={application} disabled={isUpdating} onChange={onStatusUpdate} />
            </div>
            {statusReason?.trim() && <ApplicationStatusReason label={reasonLabel} reason={statusReason} />}
        </div>
    )

    const created = dayjs(application.created).format("DD MMM YYYY")

    return (
        <div
            className={classes.card}
            onClick={onCardClick}
            role="link"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    navigate(applicationPath)
                }
            }}
        >
            <Flex className={classes.cardTop}>
                <Badge color={getApplicationStatusColor(application.status || "")} radius="md" variant="light">
                    <FormattedMessage id={`common.application-status.${application.status}`} />
                </Badge>
                {typeBadge(application.type)}
                <Text size="sm" c="dimmed">
                    {created}
                </Text>
                <Flex className={classes.rowActions} ml="auto" data-row-action>
                    {notesCounter}
                    <ApplicationAssigneeAvatar login={application.assignee} user={assigneeUser} />
                    <ApplicationMenu applicationDto={application} />
                </Flex>
            </Flex>

            <Flex className={classes.cardHeader}>
                <TextPropertyBox
                    name="pages.applications.name"
                    value={application.name}
                    icon={<Avatar name={application.name} color="initials" size={20} />}
                />
                <div className={classes.field} data-row-action>
                    <Text c="dimmed" size="xs">
                        <FormattedMessage id="pages.applications.email" />
                    </Text>
                    <Flex align="center" mt={4} gap="xs" miw={0}>
                        <IconMail size={16} style={{ flexShrink: 0 }} />
                        <CopyText text={application.email} size="sm" />
                    </Flex>
                </div>
                <div className={classes.field} data-row-action>
                    <Text c="dimmed" size="xs">
                        <FormattedMessage id="pages.applications.contractStart" />
                    </Text>
                    <Flex align="center" mt={4} gap="xs" miw={0}>
                        <IconCalendar size={16} style={{ flexShrink: 0 }} />
                        <ContractDate application={application} onChange={onContractChanged} disabled={isUpdating} />
                    </Flex>
                </div>
                <div className={classes.field} data-row-action>
                    <ApplicationAssigneeSelect application={application} disabled={isUpdating} />
                </div>
                <div className={classes.statusBox} data-row-action>
                    <Text c="dimmed" size="xs">
                        <FormattedMessage id="pages.applications.status" />
                    </Text>
                    <div className={classes.statusBoxControl}>{statusControl}</div>
                </div>
            </Flex>

            {application.skills?.trim() ? (
                <div className={classes.skillsPreview}>
                    <Text size="xs" c="dimmed" mb={4}>
                        <FormattedMessage id="pages.applications.view.skills" />
                    </Text>
                    <Text size="sm" className={classes.skillsLine} lineClamp={3}>
                        {application.skills}
                    </Text>
                </div>
            ) : null}

            {sortedNotes.length > 0 && (
                <div className={classes.skillsPreview}>
                    <Text size="xs" c="dimmed" mb={4}>
                        <FormattedMessage id="pages.applications.notes" />
                    </Text>
                    <Flex direction="column" gap={6}>
                        {sortedNotes.map((note, index) => (
                            <div key={note.id}>
                                <Text size="xs" c="dimmed">
                                    {[note.createdBy, note.createTime && dayjs(note.createTime).format("DD MMM YYYY")]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </Text>
                                <Text size="sm" className={classes.skillsLine} lineClamp={index === 0 ? 4 : 2}>
                                    {note.text}
                                </Text>
                            </div>
                        ))}
                    </Flex>
                </div>
            )}

            {application.status === ApplicationStatus.PAUSED && application.comment?.trim() ? (
                <Text size="sm" className={classes.pauseReason}>
                    <Text span c="dimmed" size="xs" mr={6}>
                        <FormattedMessage id="pages.applications.view.pause-reason" />:
                    </Text>
                    {application.comment}
                </Text>
            ) : null}
        </div>
    )
}

const typeBadge = (type: String | undefined): ReactNode => {
    if (!type) return null
    return (
        <Badge color={type === "NEW" ? "cyan" : "red"} radius="md" variant="outline">
            <FormattedMessage id={`common.application-type.${type}`} />
        </Badge>
    )
}
