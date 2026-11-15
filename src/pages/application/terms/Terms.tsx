import { Button, Checkbox, Divider, Flex, Loader, Text } from "@mantine/core"
import { useForm, zodResolver } from "@mantine/form"
import { useQuery } from "@tanstack/react-query"
import parse from "html-react-parser"
import { type ReactNode, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import ReactMarkdown from "react-markdown"
import { locales } from "src/pages/application/terms/libs/locales"
import { ApplicationJoinApiService } from "src/shared/api/ApplicationJoinApiService"
import LocalizedMarkdown from "src/shared/ui/markdown/LocalizedMarkdown"
import { z } from "zod"
import classes from "./Terms.module.scss"

interface TermsProps {
    onAccepted: () => void
}

function blank(value: string | null | undefined): boolean {
    return !value || !value.trim()
}

export const Terms = ({ onAccepted }: TermsProps) => {
    const intl = useIntl()
    const [accepted, setAccepted] = useState(false)

    const { data: cms, isLoading } = useQuery({
        queryKey: ["public-application-join"],
        queryFn: () => ApplicationJoinApiService.getPublic(),
        staleTime: 60_000,
        retry: 1,
    })

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

    const title = !blank(cms?.title) ? cms!.title : null
    const body = !blank(cms?.body) ? cms!.body : null
    const agree1 = !blank(cms?.agree1Label) ? cms!.agree1Label : null
    const agree2 = !blank(cms?.agree2Label) ? cms!.agree2Label : null
    const button = !blank(cms?.buttonLabel) ? cms!.buttonLabel : null

    if (isLoading) {
        return (
            <Flex className={classes.root} justify="center" py="xl">
                <Loader />
            </Flex>
        )
    }

    return (
        <Flex className={classes.root}>
            <Text className={classes.title}>
                {title ?? <FormattedMessage id={locales.title} />}
            </Text>
            {body ? (
                <ReactMarkdown
                    components={{
                        a: ({ href, children }: { href?: string; children?: ReactNode }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer">
                                {children}
                            </a>
                        ),
                    }}
                >
                    {body}
                </ReactMarkdown>
            ) : (
                <LocalizedMarkdown id={locales.text} />
            )}
            <Divider my="md" />
            <Checkbox
                key={form.key("agree1")}
                {...form.getInputProps("agree1")}
                label={parse(agree1 ?? intl.formatMessage({ id: locales.agree1 }))}
                color="violet"
                variant="outline"
                size="md"
                radius="xs"
            />
            <Checkbox
                key={form.key("agree2")}
                {...form.getInputProps("agree2")}
                label={parse(agree2 ?? intl.formatMessage({ id: locales.agree2 }))}
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
                    {button ?? <FormattedMessage id={locales.buttonApplication} />}
                </Button>
            </Flex>
        </Flex>
    )
}
