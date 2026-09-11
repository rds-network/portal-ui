import { Box, Card, Flex, Table, Text, Tooltip, UnstyledButton } from "@mantine/core"
import { ApplicationDto, ContractDto, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconMessageCircle } from "@tabler/icons-react"
import dayjs from "dayjs"
import { MouseEvent, ReactNode } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useNavigate } from "react-router"
import { ContractDate } from "src/pages/applications/contract/ContractDate"
import { ApplicationMenu } from "src/pages/applications/menu/ApplicationMenu"
import { useApplicationUpdate } from "src/shared/api/applications/useApplicationUpdate"
import { ApplicationAssigneeAvatar } from "../assignee/ApplicationAssigneeAvatar"
import { useScreenSize } from "src/shared/hooks/useDesktop"
import { CopyText } from "src/shared/ui/copyText/CopyText"
import { ApplicationStatusSelect } from "src/shared/ui/select/ApplicationStatusSelect"
import { ApplicationStatus } from "src/shared/user/applications"
import classes from "./ApplicationRow.module.scss"
import { ApplicationStatusReason } from "./ApplicationStatusReason"

interface ApplicationRowProps {
    applicationDto: ApplicationDto
    isMobile?: boolean
    assigneeUser?: UserInfoDto
}

export const ApplicationRow = ({
    applicationDto: application,
    isMobile = false,
    assigneeUser,
}: ApplicationRowProps) => {
    const { isLargeDesktop } = useScreenSize()
    const navigate = useNavigate()
    const intl = useIntl()
    const { mutate: updateApplication, isPending: isUpdating } = useApplicationUpdate()

    const applicationPath = `/application/${application.id}`
    const notesCount = application.notes?.length || 0
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
            >
                <IconMessageCircle size={17} stroke={1.6} aria-hidden="true" />
                <span>{notesCount > 99 ? "99+" : notesCount}</span>
            </UnstyledButton>
        </Tooltip>
    )
    const onRowClick = (event: MouseEvent<HTMLElement>) => {
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

    if (isMobile) {
        return (
            <Card shadow="sm" padding="sm" radius="md" withBorder className={classes.mobileCard} onClick={onRowClick}>
                <Flex direction="column" gap="md">
                    <Flex justify="space-between" align="center">
                        <Box className={classes.applicant}>
                            <Text component={Link} to={applicationPath} className={classes.applicationLink} size="sm">
                                {application.name}
                            </Text>
                            <Text c="dimmed" size="xs">
                                {dayjs(application.created).format("DD MMM YYYY")}
                            </Text>
                        </Box>

                        <Flex className={classes.rowActions}>
                            {notesCounter}

                            <ApplicationAssigneeAvatar login={application.assignee} user={assigneeUser} />
                            <ApplicationMenu applicationDto={application} />
                        </Flex>
                    </Flex>

                    <Box className={classes.mobileInfo}>
                        <div className={classes.mobileRow}>
                            <Text size="xs" c="dimmed" className={classes.mobileLabel}>
                                <FormattedMessage id="pages.applications.view.type" />:
                            </Text>
                            <div>{type(application.type, false)}</div>
                        </div>

                        <div className={classes.mobileRow}>
                            <Text size="xs" c="dimmed" className={classes.mobileLabel}>
                                <FormattedMessage id="pages.applications.email" />:
                            </Text>
                            <div data-row-action>
                                <CopyText text={application.email} size="xs" />
                            </div>
                        </div>

                        <div className={classes.mobileRow}>
                            <Text size="xs" c="dimmed" className={classes.mobileLabel}>
                                <FormattedMessage id="pages.applications.contractStart" />:
                            </Text>
                            <div data-row-action>
                                <ContractDate
                                    application={application}
                                    onChange={onContractChanged}
                                    disabled={isUpdating}
                                />
                            </div>
                        </div>

                        <div className={classes.mobileRow}>
                            <Text size="xs" c="dimmed" className={classes.mobileLabel}>
                                <FormattedMessage id="pages.applications.status" />:
                            </Text>
                            {statusControl}
                        </div>
                    </Box>
                </Flex>
            </Card>
        )
    }

    return (
        <Table.Tr key={application.id} className={classes.clickableRow} onClick={onRowClick}>
            <Table.Td>
                <Box>
                    <Text c="dimmed" size={isLargeDesktop ? "sm" : "xs"} className={classes.compactText}>
                        {dayjs(application.created).format(isLargeDesktop ? "DD MMM YYYY" : "DD.MM.YY")}
                    </Text>

                    {type(application.type, isLargeDesktop)}
                </Box>
            </Table.Td>
            <Table.Td>
                <Flex direction="column" gap="0" className={classes.applicant}>
                    <Text
                        component={Link}
                        to={applicationPath}
                        size={isLargeDesktop ? "sm" : "xs"}
                        truncate="end"
                        className={classes.applicationLink}
                    >
                        {application.name}
                    </Text>
                    <Box data-row-action w="fit-content" maw="100%">
                        <CopyText text={application.email} size={isLargeDesktop ? "sm" : "xs"} />
                    </Box>
                </Flex>
            </Table.Td>
            <Table.Td>
                <Box data-row-action w="fit-content">
                    <ContractDate application={application} onChange={onContractChanged} disabled={isUpdating} />
                </Box>
            </Table.Td>
            <Table.Td>{statusControl}</Table.Td>
            <Table.Td>
                <Flex className={classes.rowActions}>
                    {notesCounter}

                    <ApplicationAssigneeAvatar login={application.assignee} user={assigneeUser} />
                    <ApplicationMenu applicationDto={application} />
                </Flex>
            </Table.Td>
        </Table.Tr>
    )
}

const type = (type: String | undefined, isLargeDesktop: boolean = true): ReactNode => {
    return (
        <Text c={type === "NEW" ? "cyan" : "red"} size={isLargeDesktop ? "sm" : "xs"} className={classes.compactText}>
            <FormattedMessage id={`common.application-type.${type}`} />
        </Text>
    )
}
