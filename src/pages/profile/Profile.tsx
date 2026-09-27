import { Container, Flex, SimpleGrid, Skeleton } from "@mantine/core"
import { ResidencePermitDto, UserInfoDto } from "@rds-network/portal-api-axios"
import { useQuery } from "@tanstack/react-query"
import { useContext, useEffect, useState } from "react"
import { useIntl } from "react-intl"
import { useNavigate, useParams } from "react-router"
import { useProfileValidation } from "src/app/providers/ProfileValidationProvider"
import { UserContext } from "src/app/providers/UserContext"
import { ContractInfo } from "src/pages/profile/contract/ContractInfo"
import { ProfileInfo } from "src/pages/profile/info/ProfileInfo"
import { ResidencePermitInfo } from "src/pages/profile/residencePermit/ResidencePermitInfo"
import { UserApiService } from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { LoadingScreen } from "src/shared/ui/loading/LoadingScreen"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./Profile.module.scss"

export const Profile = () => {
    setDocumentTitleByLocale("pages.profile.documentTitle")

    const { login } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const { setShowProfileModal } = useProfileValidation()
    const { user: currentUser } = useContext(UserContext)
    const intl = useIntl()
    const [showSensitiveData, setShowSensitiveData] = useState(false)

    if (!login) {
        navigate("/not-found")
    }

    const {
        data: userInfo,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ["getInfo", login],
        queryFn: () =>
            UserApiService.getInfo(login!!).then((response) => {
                setLoading(false)
                return response.data
            }),
    })

    useEffect(() => {
        if (userInfo) {
            const isOwner = userInfo.id === currentUser?.id
            const isAdmin = hasPermission(currentUser, [UserGroup.ADMIN_VOLUNTEER])
            setShowSensitiveData(isOwner || isAdmin)
        }
    }, [userInfo])

    const handleUserInfoUpdate = () => {
        refetch()
    }

    // Показываем модальное окно при загрузке страницы профиля, если это профиль текущего пользователя и он не заполнен
    useEffect(() => {
        if (userInfo && currentUser && userInfo.username === currentUser.username) {
            const missingFields = []

            if (!userInfo.avatar?.link)
                missingFields.push(intl.formatMessage({ id: "pages.profile.validation.fields.avatar" }))
            if (!userInfo.city?.trim())
                missingFields.push(intl.formatMessage({ id: "pages.profile.validation.fields.city" }))
            if (!userInfo.postalCode?.trim())
                missingFields.push(intl.formatMessage({ id: "pages.profile.validation.fields.postalCode" }))
            if (!userInfo.address?.trim())
                missingFields.push(intl.formatMessage({ id: "pages.profile.validation.fields.address" }))
            if (!userInfo.birthDate)
                missingFields.push(intl.formatMessage({ id: "pages.profile.validation.fields.birthDate" }))
            if (!userInfo.telegram?.trim())
                missingFields.push(intl.formatMessage({ id: "pages.profile.validation.fields.telegram" }))
            if (!userInfo.phone?.trim())
                missingFields.push(intl.formatMessage({ id: "pages.profile.validation.fields.phone" }))
            if (!userInfo.program?.code)
                missingFields.push(intl.formatMessage({ id: "pages.profile.validation.fields.program" }))
            if (!userInfo.project?.code)
                missingFields.push(intl.formatMessage({ id: "pages.profile.validation.fields.project" }))
            if (!userInfo.gender)
                missingFields.push(intl.formatMessage({ id: "pages.profile.validation.fields.gender" }))

            if (missingFields.length > 0) {
                setShowProfileModal(true)
            }
        }
    }, [userInfo, currentUser, setShowProfileModal, intl])

    if (loading) {
        return <LoadingScreen />
    }

    return (
        <>
            <Flex direction="column">
                <Container className={classes.upperSpace} />
                <SimpleGrid
                    cols={{ base: 1, "40rem": 2 }}
                    spacing={{ base: "1rem" }}
                    type="container"
                    className={classes.root}
                >
                    <Skeleton visible={isFetching} radius="lg">
                        <ProfileInfo
                            userInfo={userInfo}
                            onUserInfoUpdate={handleUserInfoUpdate}
                            showSensitiveData={showSensitiveData}
                        />
                    </Skeleton>
                    <Skeleton visible={isFetching} radius="lg">
                        <Flex direction="column" gap="md">
                            {showSensitiveData && userInfo?.contracts && (
                                <ContractInfo userInfo={userInfo} contracts={userInfo.contracts} />
                            )}
                            {showSensitiveData && userInfo && (
                                <ResidencePermitInfo
                                    userInfo={userInfo}
                                    residencePermits={
                                        (
                                            userInfo as UserInfoDto & {
                                                residencePermits?: ResidencePermitDto[]
                                            }
                                        ).residencePermits || []
                                    }
                                    onUpdate={handleUserInfoUpdate}
                                />
                            )}
                        </Flex>
                    </Skeleton>
                </SimpleGrid>
            </Flex>
        </>
    )
}

export default Profile
