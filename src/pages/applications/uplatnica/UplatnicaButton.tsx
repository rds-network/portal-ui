import { Button, Flex, Modal, NumberInput, Text, TextInput } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { ApplicationDto } from "@rds-network/portal-api-axios"
import { IconReceipt } from "@tabler/icons-react"
import { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import {
    generateUplatnicaPdf,
    MEMBERSHIP_FEE,
    MEMBERSHIP_FEE_TWO_YEARS,
    suggestedMembershipFee,
} from "src/shared/docs/uplatnica"

interface UplatnicaButtonProps {
    application: ApplicationDto
    className?: string
}

export const UplatnicaButton = ({ application, className }: UplatnicaButtonProps) => {
    const intl = useIntl()
    const [opened, { open, close }] = useDisclosure(false)
    const [name, setName] = useState(application.name || "")
    const [city, setCity] = useState(application.city || "")
    const [amount, setAmount] = useState<number>(suggestedMembershipFee(application))

    const openForm = () => {
        setName(application.name || "")
        setCity(application.city || "")
        setAmount(suggestedMembershipFee(application))
        open()
    }

    const download = () => {
        const fee = Number(amount)
        if (!name.trim() || !city.trim() || !Number.isFinite(fee) || fee <= 0) return
        generateUplatnicaPdf(name, city, fee)
        close()
    }

    return (
        <>
            <Button
                variant="light"
                className={className}
                rightSection={<IconReceipt size={15} />}
                onClick={openForm}
            >
                <FormattedMessage id="pages.applications.view.uplatnica" />
            </Button>
            <Modal
                opened={opened}
                onClose={close}
                title={intl.formatMessage({ id: "pages.applications.view.uplatnicaTitle" })}
                centered
            >
                <Flex direction="column" gap="sm">
                    <Text size="sm" c="dimmed">
                        <FormattedMessage id="pages.applications.view.uplatnicaLead" />
                    </Text>
                    <TextInput
                        label={intl.formatMessage({ id: "pages.applications.view.uplatnicaName" })}
                        value={name}
                        onChange={(event) => setName(event.currentTarget.value)}
                        withAsterisk
                    />
                    <TextInput
                        label={intl.formatMessage({ id: "pages.applications.view.uplatnicaCity" })}
                        value={city}
                        onChange={(event) => setCity(event.currentTarget.value)}
                        withAsterisk
                    />
                    <NumberInput
                        label={intl.formatMessage({ id: "pages.applications.view.uplatnicaAmount" })}
                        value={amount}
                        onChange={(value) => setAmount(typeof value === "number" ? value : MEMBERSHIP_FEE)}
                        min={500}
                        step={500}
                        suffix=" RSD"
                        withAsterisk
                    />
                    <Flex gap="xs">
                        <Button variant="default" size="xs" onClick={() => setAmount(MEMBERSHIP_FEE)}>
                            <FormattedMessage id="pages.applications.view.uplatnicaYear" />
                        </Button>
                        <Button variant="default" size="xs" onClick={() => setAmount(MEMBERSHIP_FEE_TWO_YEARS)}>
                            <FormattedMessage id="pages.applications.view.uplatnicaTwoYears" />
                        </Button>
                    </Flex>
                    <Button onClick={download} disabled={!name.trim() || !city.trim() || amount <= 0}>
                        <FormattedMessage id="pages.applications.view.uplatnicaDownload" />
                    </Button>
                </Flex>
            </Modal>
        </>
    )
}
