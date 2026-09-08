import { Blockquote, Button, Divider, Flex, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { ApplicationDto, ContractDto } from "@rds-network/portal-api-axios"
import {
    IconArrowRight,
    IconAt,
    IconBrandTelegram,
    IconBriefcaseOff,
    IconBuildings,
    IconCake,
    IconClock,
    IconContract,
    IconEPassport,
    IconLanguageHiragana,
    IconListCheck,
    IconLocation,
    IconMailFilled,
    IconMapPin,
    IconPencil,
    IconPhone,
    IconWorld,
    IconGenderBigender,
} from "@tabler/icons-react"
import { useIsMutating, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useContext } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate, useParams } from "react-router"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { useProjects } from "src/app/providers/ProjectsProvider"
import { UserContext } from "src/app/providers/UserContext"
import { ContractDate } from "src/pages/applications/contract/ContractDate"
import { AddApplicationNote } from "src/pages/applications/note/AddApplicationNote"
import { ApplicationNote } from "src/pages/applications/note/ApplicationNote"
import { PrivateApplicationApiService } from "src/shared/api/applications/PrivateApplicationApiService"
import { cacheApplication, useApplicationUpdate } from "src/shared/api/applications/useApplicationUpdate"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import generateContractPdf from "src/shared/docs/contract"
import generateEnvelopPdf from "src/shared/docs/envelop"
import generateQuestionnairePdf from "src/shared/docs/questionnaire"
import { setDocumentTitleByString } from "src/shared/hooks/useDocumentTitle"
import { CopyText } from "src/shared/ui/copyText/CopyText"
import { LoadingScreen } from "src/shared/ui/loading/LoadingScreen"
import { PropertyBox } from "src/shared/ui/propertyBox/PropertyBox"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { ApplicationStatusSelect } from "src/shared/ui/select/ApplicationStatusSelect"
import { ApplicationStatus } from "src/shared/user/applications"
import { hasPermission } from "src/shared/user/roles"
import { getLocalizedName } from "src/shared/utils/getLocalName"
import { ApplicationAssigneeSelect } from "../assignee/ApplicationAssigneeSelect"
import { ApplicationStatusReason } from "../row/ApplicationStatusReason"
import { ApplicationEditDrawer } from "./ApplicationEditDrawer"
import classes from "./ApplicationView.module.scss"
import { locales } from "./lib/locales"
import { allowedRoles } from "./lib/roles"
import { useOfficialGroup } from "src/app/providers/OfficialGroupProvider"

export const ApplicationView = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const programs = usePrograms()
    const projects = useProjects()
    const officialGroups = useOfficialGroup()
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false)

    const queryClient = useQueryClient()

    if (!id) {
        navigate("/not-found", { replace: true })
    }

    if (!hasPermission(user, allowedRoles)) {
        navigate("/unauthorized")
    }

    const {
        data: application,
        isPending: isLoading,
        refetch: refetchApplication,
    } = useQuery({
        queryKey: ["getApplication", id],
        queryFn: () => PrivateApplicationApiService.getApplication(id!).then((response) => response.data),
        enabled: !!id,
    })
    const { mutate: updateApplication } = useApplicationUpdate()
    const isUpdating = useIsMutating({ mutationKey: ["writeApplication"] }) > 0
    setDocumentTitleByString(application?.name)
    const noteLogins = application?.notes?.map((note) => note.createdBy).filter(Boolean) || []
    const { data: users = {} } = resolveUsers(noteLogins)
    const program = programs.find((p) => p.code === application?.program)
    const project = projects.find((p) => p.code === application?.project)
    const officialGroup = officialGroups.find((p) => p.code === program?.officialGroup)

    if (isLoading) {
        return (
            <Flex className={classes.root} align="center" justify="center">
                <LoadingScreen />
            </Flex>
        )
    }

    if (!application) return null

    const onStatusChange = (status: string, comment?: string) => {
        if (status === application.status) return
        if (status === ApplicationStatus.DENY && comment) {
            updateApplication({ id: application.id, status, refuseReason: comment })
        } else if (status === ApplicationStatus.PAUSED && comment) {
            updateApplication({ id: application.id, status, comment })
        } else {
            updateApplication({ id: application.id, status })
        }
    }

    const onContractChanged = (contract: ContractDto) => {
        updateApplication({ id: application.id, contract })
    }

    const onApplicationUpdate = (updatedApplication: ApplicationDto) => {
        cacheApplication(queryClient, updatedApplication)
    }

    const onNoteAdded = () => {
        refetchApplication()
    }

    const onNoteDeleted = () => {
        refetchApplication()
    }

    const statusReason =
        application.status === ApplicationStatus.PAUSED
            ? application.comment
            : application.status === ApplicationStatus.DENY
              ? application.refuseReason
              : undefined

    return (
        <Flex className={classes.root}>
            <Text className={classes.title}>
                <FormattedMessage id={locales.title} />
            </Text>
            <Flex className={classes.wrapContainer}>
                <Flex direction="column" gap="md" className={classes.info}>
                    <Text className={classes.name} variant="gradient">
                        {application.name + (application.patronymic ? ` (${application.patronymic})` : "")}
                    </Text>
                    <Flex className={classes.fields}>
                        <TextPropertyBox
                            name={locales.createdAt}
                            value={dayjs(application.created).format("DD MMMM YYYY, HH:mm")}
                            icon={<IconClock size={14} />}
                        />
                        <TextPropertyBox
                            name={locales.type}
                            value={<FormattedMessage id={`common.application-type.${application.type}`} />}
                        />
                    </Flex>
                    <Flex className={classes.fields}>
                        {application.email && (
                            <TextPropertyBox
                                name={locales.email}
                                value={<CopyText text={application.email} />}
                                icon={<IconAt size={14} />}
                            />
                        )}
                        {application.phone && (
                            <TextPropertyBox
                                name={locales.phone}
                                value={<CopyText text={application.phone} />}
                                icon={<IconPhone size={14} />}
                            />
                        )}
                        {application.telegram && (
                            <TextPropertyBox
                                name={locales.telegram}
                                value={application.telegram}
                                href={`https://t.me/${application.telegram}`}
                                icon={<IconBrandTelegram size={14} />}
                            />
                        )}
                        {application.birthDate && (
                            <TextPropertyBox
                                name={locales.birthDate}
                                value={dayjs(application.birthDate).format("DD MMM YYYY")}
                                icon={<IconCake size={14} />}
                            />
                        )}
                        {application.passport && (
                            <TextPropertyBox
                                name={locales.passport}
                                value={<CopyText text={application.passport} />}
                                icon={<IconEPassport size={14} />}
                            />
                        )}
                        {application.citizenship && (
                            <TextPropertyBox
                                name={locales.citizenship}
                                value={application.citizenship}
                                icon={<IconWorld size={14} />}
                            />
                        )}
                        {application.gender && (
                            <TextPropertyBox
                                name={locales.gender}
                                value={
                                    <FormattedMessage
                                        id={`pages.applications.view.gender.${application.gender.toLowerCase()}`}
                                    />
                                }
                                icon={<IconGenderBigender size={14} />}
                            />
                        )}
                    </Flex>
                    <Divider className={classes.divider} />
                    <Text size="sm" c="dimmed">
                        {(application.inSerbia
                            ? intl.formatMessage({ id: locales.inSerbia })
                            : intl.formatMessage({ id: locales.outSerbia })
                        )
                            .concat(" ")
                            .concat(
                                application.residenceRequired
                                    ? intl.formatMessage({ id: locales.residenceRequired })
                                    : intl.formatMessage({ id: locales.residenceNotRequired })
                            )}
                    </Text>
                    {application.inSerbia && (
                        <Flex className={classes.fields}>
                            {application.enterDate && (
                                <TextPropertyBox
                                    name={locales.enterDate}
                                    value={dayjs(application.enterDate).format("DD MMM YYYY")}
                                    icon={<IconArrowRight size={14} />}
                                />
                            )}
                            {application.city && (
                                <TextPropertyBox
                                    name={locales.city}
                                    value={application.city}
                                    icon={<IconBuildings size={14} />}
                                />
                            )}
                            {application.postalCode && (
                                <TextPropertyBox
                                    name={locales.postalCode}
                                    value={application.postalCode}
                                    icon={<IconMapPin size={14} />}
                                />
                            )}
                            {application.address && (
                                <TextPropertyBox
                                    name={locales.address}
                                    value={<CopyText text={application.address} />}
                                    icon={<IconLocation size={14} />}
                                />
                            )}
                        </Flex>
                    )}
                    <Divider className={classes.divider} />
                    <Flex className={classes.fields}>
                        {application.program && (
                            <TextPropertyBox
                                name={locales.program}
                                value={program ? getLocalizedName(program, intl.locale) : application.program}
                            />
                        )}
                        {application.project && (
                            <TextPropertyBox
                                name={locales.project}
                                value={project ? getLocalizedName(project, intl.locale) : application.project}
                            />
                        )}
                        {application.occupation && (
                            <TextPropertyBox name={locales.occupation} value={application.occupation} />
                        )}
                    </Flex>
                    {application.hasExperience && (
                        <TextPropertyBox
                            name={locales.experience}
                            value={<Text className={classes.textCard}>{application.experience}</Text>}
                        />
                    )}
                    {!application.hasExperience && (
                        <Flex columnGap="sm" align="center">
                            <IconBriefcaseOff size={16} color="gray" />
                            <Text size="sm" c="dimmed">
                                <FormattedMessage id={locales.noExperience} />
                            </Text>
                        </Flex>
                    )}
                    {application.languages && (
                        <TextPropertyBox
                            name={locales.languages}
                            value={application.languages}
                            icon={<IconLanguageHiragana size={16} />}
                        />
                    )}
                    {application.skills && (
                        <TextPropertyBox
                            name={locales.skills}
                            value={application.skills}
                            className={classes.textCard}
                        />
                    )}
                    {application.goal && (
                        <PropertyBox
                            name={locales.goal}
                            value={<Blockquote className={classes.textCard}>{application.goal}</Blockquote>}
                        />
                    )}
                    {application.bio && (
                        <PropertyBox
                            name={locales.bio}
                            value={<Blockquote className={classes.textCard}>{application.bio}</Blockquote>}
                        />
                    )}
                </Flex>
                <Flex className={classes.sidebar} direction="column" gap={24}>
                    <Flex gap="md" direction="column" className={classes.controls}>
                        <ApplicationAssigneeSelect application={application} disabled={isUpdating} />
                        <PropertyBox
                            className={classes.controlField}
                            align="start"
                            name={locales.status}
                            value={
                                <Flex className={classes.statusControl}>
                                    <div className={classes.statusField}>
                                        <ApplicationStatusSelect
                                            application={application}
                                            className={classes.statusSelect}
                                            onChange={onStatusChange}
                                            disabled={isUpdating}
                                            showInlineReason={false}
                                        />
                                    </div>
                                    {statusReason?.trim() && (
                                        <ApplicationStatusReason
                                            label={intl.formatMessage({
                                                id:
                                                    application.status === ApplicationStatus.PAUSED
                                                        ? locales.pauseReason
                                                        : locales.refuseReason,
                                            })}
                                            reason={statusReason}
                                        />
                                    )}
                                </Flex>
                            }
                        />
                        <PropertyBox
                            className={classes.controlField}
                            name={locales.contractStart}
                            value={
                                <ContractDate
                                    application={application}
                                    onChange={onContractChanged}
                                    disabled={isUpdating}
                                    className={classes.contractDate}
                                />
                            }
                        />
                        <Button
                            variant="gradient"
                            rightSection={<IconContract size={14} />}
                            disabled={application.contract == null}
                            className={classes.contractGenerate}
                            onClick={() => {
                                generateContractPdf(application, officialGroup)
                            }}
                        >
                            <FormattedMessage id={locales.contractDownload} />
                        </Button>
                        <Button
                            variant="light"
                            rightSection={<IconListCheck size={15} />}
                            disabled={application.contract == null}
                            className={classes.questionnaireGenerate}
                            onClick={() => {
                                generateQuestionnairePdf(application)
                            }}
                        >
                            <FormattedMessage id={locales.questionnaireDownload} />
                        </Button>
                        <Button
                            variant="light"
                            rightSection={<IconMailFilled size={15} />}
                            disabled={application.contract == null}
                            className={classes.envelopGenerate}
                            onClick={() => {
                                generateEnvelopPdf(application)
                            }}
                        >
                            <FormattedMessage id={locales.envelopDownload} />
                        </Button>
                        <Button
                            variant="outline"
                            rightSection={<IconPencil size={14} />}
                            onClick={openDrawer}
                            disabled={isUpdating || application.status === ApplicationStatus.DONE}
                        >
                            <FormattedMessage id="pages.profile.buttons.edit" />
                        </Button>
                    </Flex>

                    <Flex className={classes.notes} direction="column" gap="md">
                        <Text fw="bold" size="lg">
                            <FormattedMessage id={locales.notes} />
                        </Text>

                        <AddApplicationNote applicationId={application.id} onNoteAdded={onNoteAdded} />

                        {application.notes && application.notes.length > 0 && (
                            <Flex direction="column" gap={24}>
                                {application.notes
                                    .sort((n1: any, n2: any) => dayjs(n2.createTime).diff(dayjs(n1.createTime)))
                                    .map((note: any) => (
                                        <ApplicationNote
                                            key={note.id}
                                            note={note}
                                            userInfo={users[note.createdBy]}
                                            onNoteDeleted={onNoteDeleted}
                                        />
                                    ))}
                            </Flex>
                        )}
                    </Flex>
                </Flex>
            </Flex>

            <ApplicationEditDrawer
                opened={drawerOpened}
                onClose={closeDrawer}
                application={application}
                onApplicationUpdate={onApplicationUpdate}
            />
        </Flex>
    )
}

export default ApplicationView
