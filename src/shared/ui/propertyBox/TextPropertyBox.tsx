import { Anchor, Flex, Text } from "@mantine/core"
import { ReactElement, ReactNode } from "react"
import { FormattedMessage } from "react-intl"

export const TextPropertyBox = ({
    name,
    value,
    icon,
    href,
    justify,
    className,
    valueColor,
}: {
    name: string
    value?: ReactNode
    icon?: ReactElement
    href?: string
    justify?: string
    className?: string
    valueColor?: string
}) => {
    if (!value) {
        return <Flex />
    }

    const textAlign =
        justify === "flex-end"
            ? "right"
            : justify === "center"
              ? "center"
              : justify === "flex-start"
                ? "left"
                : undefined

    return (
        <Flex direction="column" className={className} miw={0} maw="100%">
            <Text c="dimmed" size="xs" ta={textAlign} ms={justify === "flex-end" ? "auto" : ""}>
                <FormattedMessage id={name} />
            </Text>
            {icon ? (
                <Flex align="center" mt={4} gap="xs" justify={justify} miw={0}>
                    <Flex style={{ flexShrink: 0 }}>{icon}</Flex>
                    {href ? (
                        <Anchor href={href} target="_blank" miw={0} style={{ overflowWrap: "anywhere" }}>
                            <Text truncate="end" style={{ maxWidth: "100%" }} size="sm" c={valueColor}>
                                {value}
                            </Text>
                        </Anchor>
                    ) : (
                        <Text size="sm" c={valueColor} style={{ overflowWrap: "anywhere" }}>
                            {value}
                        </Text>
                    )}
                </Flex>
            ) : (
                <Text mt={4} ms={justify === "flex-end" ? "auto" : ""} size="sm" c={valueColor} ta={textAlign}>
                    {value}
                </Text>
            )}
        </Flex>
    )
}
