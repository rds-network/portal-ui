import { Button, Flex, Text } from "@mantine/core"
import { ContractDto, UserInfoDto } from "@rds-network/portal-api-axios"
import { IconCalendar, IconContract, IconPencil } from "@tabler/icons-react"
import dayjs from "dayjs"
import { useContext, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { locales } from "src/pages/profile/contract/lib/locales"
import { TextPropertyBox } from "src/shared/ui/propertyBox/TextPropertyBox"
import { TooltipLocalized } from "src/shared/ui/tooltip/TooltipLocalized"
import { ContractDrawer } from "./ContractDrawer"
import classes from "./ContractInfo.module.scss"
import { hasPermission, UserGroup } from "src/shared/user/roles"

interface ContractInfoProps {
    userInfo: UserInfoDto
    contracts: ContractDto[]
}

export const ContractInfo = ({ contracts, userInfo }: ContractInfoProps) => {
    const navigate = useNavigate()
    const { user: currentUser } = useContext(UserContext)
    const [drawerOpened, setDrawerOpened] = useState(false)

    const daysLeft = contracts.length > 0 ? getDaysLeft(contracts) : 0

    return (
        <Flex className={classes.root}>
            {contracts.length === 0 ? (
                <>
                    <Text className={classes.title}>
                        <FormattedMessage id={locales.titleWithoutContract} />
                    </Text>
                    {(userInfo.id === currentUser?.id ||
                        hasPermission(currentUser, [
                            UserGroup.ADMIN,
                            UserGroup.ADMIN_SSO,
                            UserGroup.ADMIN_VOLUNTEER,
                            UserGroup.ADMIN_WP,
                            UserGroup.DEVELOPER,
                        ])) && (
                        <Button variant="light" onClick={() => setDrawerOpened(true)}>
                            <FormattedMessage id={"pages.profile.contract.button"} />
                        </Button>
                    )}
                </>
            ) : (
                <>
                    <Text className={classes.title}>
                        <FormattedMessage id={locales.title} />
                    </Text>
                    <Flex className={classes.props}>
                        <TextPropertyBox
                            name={locales.dateUntil}
                            icon={<IconCalendar size={14} />}
                            value={dayjs(getLastContractDate(contracts)).format("DD MMM YYYY")}
                        />
                        <TextPropertyBox
                            name={locales.type}
                            icon={<IconContract size={14} />}
                            value={<FormattedMessage id={`common.contract-type.${getLastContract(contracts).type}`} />}
                        />
                    </Flex>
                    <Text
                        className={classes.daysLeft}
                        c={daysLeft < 0 ? "red" : undefined}
                        fw={daysLeft < 0 ? 700 : 400}
                    >
                        {daysLeft < 0 ? (
                            <FormattedMessage id={locales.expired} />
                        ) : (
                            <FormattedMessage id={locales.daysLeft} values={{ count: daysLeft }} />
                        )}
                    </Text>
                    {userInfo.id === currentUser?.id && (
                        <TooltipLocalized text={locales.prolongationInfo} position="bottom">
                            <Button variant="light" onClick={() => navigate("/application")} disabled={daysLeft > 90}>
                                <FormattedMessage id={locales.prolongation} />
                            </Button>
                        </TooltipLocalized>
                    )}
                    {hasPermission(currentUser, [UserGroup.ADMIN_SSO, UserGroup.ADMIN_VOLUNTEER]) && (
                        <Button
                            variant="outline"
                            onClick={() => setDrawerOpened(true)}
                            rightSection={<IconPencil size={14} />}
                        >
                            <FormattedMessage id="pages.profile.buttons.edit" />
                        </Button>
                    )}
                </>
            )}

            <ContractDrawer
                opened={drawerOpened}
                onClose={() => setDrawerOpened(false)}
                onSuccess={() => {
                    // нужен в UserList
                }}
                userId={userInfo.id}
                contracts={contracts}
            />
        </Flex>
    )
}

const getLastContract = (contracts: ContractDto[]): ContractDto => {
    return contracts.reduce((max, current) => {
        return new Date(current.endDate) > new Date(max.endDate) ? current : max
    }, contracts[0])
}

const getLastContractDate = (contracts: ContractDto[]): Date => {
    return new Date(getLastContract(contracts).endDate)
}

const getDaysLeft = (contracts: ContractDto[]): number => {
    const endDate = getLastContractDate(contracts)
    return dayjs(endDate).diff(new Date(), "day")
}
