import { Button, Checkbox, Divider, Flex, Text } from "@mantine/core"
import { useForm, zodResolver } from "@mantine/form"
import parse from "html-react-parser"
import { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { locales } from "src/pages/application/terms/libs/locales"
import LocalizedMarkdown from "src/shared/ui/markdown/LocalizedMarkdown"
import { z } from "zod"
import classes from "./Terms.module.scss"

interface TermsProps {
    onAccepted: () => void
}

export const Terms = ({ onAccepted }: TermsProps) => {
    const intl = useIntl()
    const [accepted, setAccepted] = useState(false)

    const requiredMessage = { message: intl.formatMessage({ id: locales.required }) }
    const validationSchema = z.object({
        agree1: z.boolean(requiredMessage),
        agree2: z.boolean(requiredMessage),
    })

    const form = useForm({
        mode: "uncontrolled",
        validate: zodResolver(validationSchema),
        onValuesChange: (values) => {
            setAccepted(values["agree1"] && values["agree2"])
        },
    })

    return (
        <Flex className={classes.root}>
            <Text className={classes.title}>
                <FormattedMessage id={locales.title} />
            </Text>
            <LocalizedMarkdown id={locales.text} />
            <Divider my="md" />
            <Checkbox
                key={form.key("agree1")}
                {...form.getInputProps("agree1")}
                label={parse(intl.formatMessage({ id: locales.agree1 }))}
                color="violet"
                variant="outline"
                size="md"
                radius="xs"
            />
            <Checkbox
                key={form.key("agree2")}
                {...form.getInputProps("agree2")}
                label={parse(intl.formatMessage({ id: locales.agree2 }))}
                color="violet"
                variant="outline"
                size="md"
                radius="xs"
            />
            <Flex justify="center">
                <Button
                    className={classes.button}
                    disabled={!accepted}
                    variant="light"
                    radius="md"
                    onClick={() => onAccepted()}
                >
                    <FormattedMessage id={locales.buttonApplication} />
                </Button>
            </Flex>
        </Flex>
    )
}
