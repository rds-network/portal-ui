import { Badge, Button, Container, Drawer, Flex, Modal, Select, Text, TextInput, Tooltip } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { useForm, zodResolver } from "@mantine/form"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { GenderEnumDto, UserInfoDto, UserInfoUpdateRequest } from "@rds-network/portal-api-axios"
import {
    IconBrandTelegram,
    IconBuildings,
    IconDeviceFloppy,
    IconGenderMale,
    IconGift,
    IconHome,
    IconInfoCircle,
    IconMail,
    IconMapPin,
    IconIdBadge,
    IconPencil,
    IconPhone,
} from "@tabler/icons-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useContext, useEffect, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import commonClasses from "src/app/styles/private.module.scss"
import { ProfileAvatar } from "src/pages/profile/avatar/ProfileAvatar"
import { UserMenu } from "src/pages/users/userMenu/UserMenu"
import { CitiesApiService } from "src/shared/api/CitiesApiService"
import { UserApiService } from "src/shared/api/user/UserApiService"
import { Locale } from "src/shared/constants/Locales"
import { useProgramProjectFilter } from "src/shared/hooks/useProgramProjectFilter"
import { ErrorNotification } from "src/shared/notifications/ErrorNotification"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { CitySelect } from "src/shared/ui/citySelect/CitySelect"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import { getFullAddress } from "src/shared/utils/getFullAddress"
import { z } from "zod"
import { ProgramSelectInline } from "../select/ProgramSelect"
import { ProjectSelectInline } from "../select/ProjectSelect"
import classes from "./ProfileInfo.module.scss"
import { IDBadge } from "src/shared/ui/badges/IDBadge"
import { VolunteerIDCard } from "src/pages/profile/idCard/VolunteerIDCard"

interface ProfileInfoProps {
    userInfo: UserInfoDto | undefined
    onUserInfoUpdate?: (userInfo: UserInfoDto) => void
    showSensitiveData?: boolean | undefined
}

export const ProfileInfo = ({ userInfo, onUserInfoUpdate, showSensitiveData }: ProfileInfoProps) => {
    const { user: currentUser, setUser } = useContext(UserContext)
    const [opened, { open, close }] = useDisclosure(false)
    const [idCardOpened, { open: openIDCard, close: closeIDCard }] = useDisclosure(false)
    const intl = useIntl()
    const locale = intl.locale as Locale

    const { data: cities = [] } = useQuery({
        queryKey: ["cities"],
        queryFn: () => CitiesApiService.getCities().then((response) => response.data),
    })

    const validationSchema = z.object({
        city: z
            .string()
            .max(100, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 100 }))
            .refine(
                (val) => !val || !cities.length || cities.some((c) => c.name === val || c.nameCyrillic === val),
                intl.formatMessage({ id: "pages.profile.validation.cityNotInList" })
            )
            .or(z.literal("")),
        postalCode: z
            .string()
            .regex(/^\d{5}$/, intl.formatMessage({ id: "pages.profile.validation.invalidPostalCode" }))
            .optional()
            .or(z.literal("")),
        address: z
            .string()
            .max(200, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 200 }))
            .optional()
            .or(z.literal("")),
        birthDate: z
            .string()
            .refine(
                (val) => {
                    const date = dayjs(val, "YYYY-MM-DD", true)
                    return date.isValid() && date.isBefore(dayjs()) && date.isAfter(dayjs().subtract(120, "years"))
                },
                intl.formatMessage({ id: "pages.profile.validation.invalidBirthDate" })
            )
            .refine(
                (val) => {
                    const date = dayjs(val, "YYYY-MM-DD", true)
                    return date.isBefore(dayjs().subtract(18, "years"))
                },
                intl.formatMessage({ id: "pages.profile.validation.tooYoung" })
            )
            .optional()
            .or(z.literal("")),
        telegram: z
            .string()
            .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, intl.formatMessage({ id: "pages.profile.validation.invalidTelegram" }))
            .max(32, intl.formatMessage({ id: "pages.profile.validation.maxLetters" }, { count: 32 }))
            .optional()
            .or(z.literal("")),
        phone: z
            .string()
            .regex(/^\+?\d{10,15}$/, intl.formatMessage({ id: "pages.profile.validation.invalidPhone" }))
            .optional()
            .or(z.literal("")),
    })

    const form = useForm({
        initialValues: {
            city: userInfo?.city || "",
            postalCode: userInfo?.postalCode || "",
            address: userInfo?.address || "",
            birthDate: userInfo?.birthDate || "",
            telegram: userInfo?.telegram || "",
            phone: userInfo?.phone || "",
            gender: (userInfo?.gender as string) || "",
        },
        validate: zodResolver(validationSchema),
    })

    if (!userInfo) return null

    const onClickSave = async () => {
        const formValues = form.values

        if (form.validate().hasErrors) {
            return
        }

        const updateData: UserInfoUpdateRequest = {}
        if (formValues.city?.trim()) updateData.city = formValues.city.trim()
        if (formValues.postalCode?.trim()) updateData.postalCode = formValues.postalCode.trim()
        if (formValues.address?.trim()) updateData.address = formValues.address.trim()
        if (formValues.birthDate?.trim()) updateData.birthDate = formValues.birthDate.trim()
        if (formValues.telegram?.trim()) updateData.telegram = formValues.telegram.trim()
        if (formValues.phone?.trim()) updateData.phone = formValues.phone.trim()
        if (formValues.gender?.trim()) updateData.gender = formValues.gender as GenderEnumDto

        updateProfile(updateData)
    }

    const { mutate: updateProfile, isPending } = useMutation({
        mutationFn: async (data: UserInfoUpdateRequest) => {
            const targetUsername = userInfo.username

            const response = await UserApiService.updateInfo(targetUsername, data)
            return response.data
        },
        onSuccess: async (data) => {
            if (userInfo?.username === currentUser?.username) {
                setUser(data)
            }

            if (onUserInfoUpdate) {
                onUserInfoUpdate(data)
            }

            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.profileUpdated" />
                    </Text>,
                    null
                )
            )
            close()
        },
        onError: () => {
            notifications.show(
                ErrorNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.updateError" />
                    </Text>
                )
            )
        },
    })

    const { mutateAsync: updateProgram } = useMutation({
        mutationFn: async (program: string) => {
            const response = await UserApiService.setProgram(userInfo.id, program)
            return response.data
        },
        onSuccess: async (data) => {
            if (userInfo?.username === currentUser?.username) {
                setUser(data)
            }

            if (onUserInfoUpdate) {
                onUserInfoUpdate(data)
            }

            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.profileUpdated" />
                    </Text>,
                    null
                )
            )
        },
        onError: () => {
            notifications.show(
                ErrorNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.updateError" />
                    </Text>
                )
            )
        },
    })

    const { mutateAsync: updateProject } = useMutation({
        mutationFn: async (project: string) => {
            const response = await UserApiService.setProject(userInfo.id, project)
            return response.data
        },
        onSuccess: async (data) => {
            if (userInfo?.username === currentUser?.username) {
                setUser(data)
            }

            if (onUserInfoUpdate) {
                onUserInfoUpdate(data)
            }

            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.profileUpdated" />
                    </Text>,
                    null
                )
            )
        },
        onError: () => {
            notifications.show(
                ErrorNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.profile.updateError" />
                    </Text>
                )
            )
        },
    })

    const iconTelegram = <IconBrandTelegram size={16} />
    const iconPhone = <IconPhone size={16} />
    const iconHome = <IconHome size={16} />
    const iconCity = <IconBuildings size={16} />
    const iconMap = <IconMapPin size={16} />
    const iconBirthday = <IconGift size={16} />
    const [isSyncing, setIsSyncing] = useState(false)
    const programValue = userInfo?.program?.code ?? null
    const projectValue = userInfo?.project?.code ?? null

    const [selectedProgram, setSelectedProgram] = useState<string | null>(programValue)
    const [selectedProject, setSelectedProject] = useState<string | null>(projectValue)

    useEffect(() => {
        if (selectedProgram !== programValue) {
            setSelectedProgram(programValue)
        }
        if (selectedProject !== projectValue) {
            setSelectedProject(projectValue)
        }
    }, [programValue, projectValue])

    const { programs, visiblePrograms, visibleProjects } = useProgramProjectFilter(selectedProgram, selectedProject)

    // Админы могут редактировать программы всем (включая себя)
    // Обычные пользователи могут установить программу только если у них ее еще нет
    const isAdmin = hasPermission(currentUser, [UserGroup.ADMIN_SSO, UserGroup.ADMIN_VOLUNTEER])
    const isOwnProfile = userInfo?.id === currentUser?.id
    const hasProgram = !!programValue

    const canEditProgram = isAdmin || (isOwnProfile && !hasProgram)

    // Пользователи могут редактировать только свой проект или админы
    const canEditProject = isOwnProfile || isAdmin

    // Разрешаем менять пол своему профилю и админам
    const canEditGender = isAdmin || isOwnProfile

    const handleProgramChange = async (programCode: string) => {
        if (isSyncing) return

        const prevProgram = selectedProgram
        const prevProject = selectedProject

        setSelectedProgram(programCode)
        setSelectedProject(null)
        try {
            await updateProgram(programCode)
        } catch {
            setSelectedProgram(prevProgram)
            setSelectedProject(prevProject)
        }
    }

    const handleProjectChange = async (projectCode: string) => {
        if (isSyncing) return

        const prevProject = selectedProject

        setSelectedProject(projectCode)
        try {
            await updateProject(projectCode)
        } catch {
            setSelectedProject(prevProject)
        }
    }

    // Если выбрали программу, а текущий проект к ней не относится очищаем проект
    useEffect(() => {
        if (!selectedProgram || !selectedProject) return

        const normalizedSelectedProgram = selectedProgram.toUpperCase()

        const program = programs.find((p) => p.code.toUpperCase() === normalizedSelectedProgram)
        const allowed = program?.projectCodes ?? []

        if (!allowed.includes(selectedProject)) {
            setIsSyncing(true)
            setSelectedProject(null)
            setIsSyncing(false)
        }
    }, [selectedProgram, selectedProject, programs])

    return (
        <Flex direction="column" className={classes.infoContainer}>
            <Flex justify="space-between">
                <ProfileAvatar link={userInfo?.avatar?.link} editable={currentUser?.username === userInfo?.username} />

                <Flex gap="xs">
                    {!userInfo?.active && (
                        <Badge color="red" radius="md" variant="light">
                            <FormattedMessage id="pages.profile.deactivated" />
                        </Badge>
                    )}

                    {showSensitiveData && userInfo?.id !== currentUser?.id && (
                        <UserMenu user={userInfo} type="profile" />
                    )}
                </Flex>
            </Flex>
            <Text className={classes.userName}>{userInfo?.fullName}</Text>
            <IDBadge id={userInfo.id} />
            <ProgramSelectInline
                value={selectedProgram}
                canEdit={canEditProgram}
                locale={locale}
                onChange={handleProgramChange}
                programsOverride={visiblePrograms}
            />
            <ProjectSelectInline
                value={selectedProject}
                canEdit={canEditProject}
                locale={locale}
                onChange={handleProjectChange}
                projectsOverride={visibleProjects}
            />
            <Container className={commonClasses.divider} />
            <TextPropertyBox
                name={"pages.profile.props.address"}
                value={
                    showSensitiveData
                        ? getFullAddress(userInfo?.postalCode, userInfo?.city, userInfo?.address)
                        : userInfo?.city
                }
                icon={<IconHome size={18} />}
                className={classes.propertyBox}
            />
            {showSensitiveData && (
                <TextPropertyBox
                    name={"pages.profile.props.gender"}
                    value={
                        userInfo?.gender
                            ? intl.formatMessage({ id: `pages.profile.props.gender.${userInfo.gender.toLowerCase()}` })
                            : intl.formatMessage({ id: "pages.profile.props.gender.notSelected" })
                    }
                    icon={<IconGenderMale size={18} />}
                    className={classes.propertyBox}
                />
            )}
            <TextPropertyBox
                name={"pages.profile.props.birthDate"}
                value={
                    showSensitiveData
                        ? dayjs(userInfo?.birthDate).format("DD MMMM YYYY")
                        : dayjs(userInfo?.birthDate).format("DD MMMM")
                }
                icon={<IconGift size={18} />}
                className={classes.propertyBox}
            />
            <Container className={commonClasses.divider} />
            {showSensitiveData && (
                <TextPropertyBox
                    name={"pages.profile.props.email"}
                    value={userInfo?.email}
                    icon={<IconMail size={18} />}
                    href={`mailto:${userInfo?.email}`}
                    className={classes.propertyBox}
                />
            )}
            <TextPropertyBox
                name={"pages.profile.props.telegram"}
                value={userInfo?.telegram}
                icon={<IconBrandTelegram size={18} />}
                href={`https://t.me/${userInfo?.telegram}`}
                className={classes.propertyBox}
            />
            {showSensitiveData && (
                <TextPropertyBox
                    name={"pages.profile.props.phone"}
                    value={userInfo?.phone}
                    icon={<IconPhone size={18} />}
                    className={classes.propertyBox}
                />
            )}
            <Button
                onClick={openIDCard}
                className={classes.button}
                variant="light"
                color="teal"
                rightSection={<IconIdBadge size={14} />}
            >
                <FormattedMessage id={"pages.profile.buttons.idCard"} />
            </Button>
            {(userInfo?.id === currentUser?.id ||
                hasPermission(currentUser, [UserGroup.ADMIN_SSO, UserGroup.ADMIN_VOLUNTEER])) && (
                <Button
                    onClick={open}
                    className={classes.button}
                    variant="outline"
                    rightSection={<IconPencil size={14} />}
                >
                    <FormattedMessage id={"pages.profile.buttons.edit"} />
                </Button>
            )}
            <Modal
                opened={idCardOpened}
                onClose={closeIDCard}
                title={<FormattedMessage id="pages.profile.idCard.title" />}
                centered
                size="auto"
            >
                <VolunteerIDCard userInfo={userInfo} />
            </Modal>
            <Drawer opened={opened} onClose={close} title={<FormattedMessage id="pages.profile.documentTitle" />}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        onClickSave()
                    }}
                >
                    <Flex direction="column" gap="md">
                        <CitySelect
                            leftSection={iconCity}
                            label={<FormattedMessage id="pages.profile.props.city" />}
                            withAsterisk
                            {...form.getInputProps("city")}
                        />
                        <TextInput
                            leftSection={iconMap}
                            label={<FormattedMessage id="pages.profile.props.postalCode" />}
                            {...form.getInputProps("postalCode")}
                        />
                        <TextInput
                            leftSection={iconHome}
                            label={<FormattedMessage id="pages.profile.props.address" />}
                            {...form.getInputProps("address")}
                        />
                        <DateInput
                            leftSection={iconBirthday}
                            valueFormat="DD MMMM YYYY"
                            label={<FormattedMessage id="pages.profile.props.birthDate" />}
                            value={form.values.birthDate ? dayjs(form.values.birthDate).toDate() : null}
                            onChange={(date) => {
                                form.setFieldValue("birthDate", date ? dayjs(date).format("YYYY-MM-DD") : "")
                            }}
                            error={form.errors.birthDate}
                            clearable
                        />
                        <TextInput
                            leftSection={iconTelegram}
                            label={<FormattedMessage id="pages.profile.props.telegram" />}
                            {...form.getInputProps("telegram")}
                        />
                        <TextInput
                            leftSection={iconPhone}
                            label={<FormattedMessage id="pages.profile.props.phone" />}
                            {...form.getInputProps("phone")}
                        />
                        <Select
                            leftSection={<IconGenderMale size={16} />}
                            label={
                                <Flex align="center" gap={6}>
                                    <FormattedMessage id="pages.profile.props.gender" />
                                    <Tooltip
                                        label={intl.formatMessage({ id: "pages.profile.props.gender.hint" })}
                                        multiline
                                        withArrow
                                        w={380}
                                        events={{ hover: true, focus: true, touch: true }}
                                        withinPortal
                                    >
                                        <span
                                            tabIndex={0}
                                            role="button"
                                            aria-label={intl.formatMessage({ id: "pages.profile.props.gender.hint" })}
                                            style={{ display: "inline-flex" }}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onTouchStart={(e) => e.preventDefault()}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <IconInfoCircle size={14} />
                                        </span>
                                    </Tooltip>
                                </Flex>
                            }
                            data={[
                                {
                                    value: GenderEnumDto.Male,
                                    label: intl.formatMessage({ id: "pages.profile.props.gender.male" }),
                                },
                                {
                                    value: GenderEnumDto.Female,
                                    label: intl.formatMessage({ id: "pages.profile.props.gender.female" }),
                                },
                            ]}
                            disabled={!canEditGender}
                            {...form.getInputProps("gender")}
                        />
                        <Button type="submit" loading={isPending} rightSection={<IconDeviceFloppy size={14} />}>
                            <FormattedMessage id="pages.profile.buttons.save" />
                        </Button>
                    </Flex>
                </form>
            </Drawer>
        </Flex>
    )
}
