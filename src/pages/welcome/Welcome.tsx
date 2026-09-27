import { Button, Container, Flex, Group, Image, List, ScrollArea, Text, ThemeIcon, Title } from "@mantine/core"
import { IconCheck, IconLogin2 } from "@tabler/icons-react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router"
import { locale } from "src/pages/welcome/lib/locale"
import image from "src/pages/welcome/resources/image.svg"
import classes from "src/pages/welcome/Welcome.module.scss"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"

export const Welcome = () => {
    setDocumentTitleByLocale(locale.documentTitle)
    const navigate = useNavigate()

    return (
        <Flex className={classes.rootFlex} align="center">
            <ScrollArea className={classes.contentFlex}>
                <Flex align="center">
                    <Container>
                        <Flex>
                            <Flex direction="column">
                                <Title className={classes.title}>
                                    <Flex className={classes.highlight}>
                                        <FormattedMessage id={locale.title} />
                                    </Flex>
                                </Title>
                                <Text c="dimmed" className={classes.description}>
                                    <FormattedMessage id={locale.subTitle} />
                                </Text>

                                <List
                                    spacing="sm"
                                    className={classes.list}
                                    icon={
                                        <ThemeIcon size={20} radius="xl">
                                            <IconCheck className={classes.iconCheck} stroke={1.5} />
                                        </ThemeIcon>
                                    }
                                >
                                    <List.Item>
                                        <b>
                                            <FormattedMessage id={locale.benefitName1} />
                                        </b>{" "}
                                        – <FormattedMessage id={locale.benefitDescription1} />
                                    </List.Item>
                                    <List.Item>
                                        <b>
                                            <FormattedMessage id={locale.benefitName2} />
                                        </b>{" "}
                                        – <FormattedMessage id={locale.benefitDescription2} />
                                    </List.Item>
                                    <List.Item>
                                        <b>
                                            <FormattedMessage id={locale.benefitName3} />
                                        </b>{" "}
                                        – <FormattedMessage id={locale.benefitDescription3} />
                                    </List.Item>
                                </List>

                                <Group className={classes.controlGroup}>
                                    <Button
                                        radius="md"
                                        color="ocean"
                                        className={classes.control}
                                        rightSection={<IconLogin2 size={18} />}
                                        onClick={() => navigate(`/login`)}
                                        variant="filled"
                                    >
                                        <Flex className={classes.login}>
                                            <FormattedMessage id={locale.buttonLogin} />
                                        </Flex>
                                    </Button>
                                    <Button
                                        variant="default"
                                        radius="md"
                                        className={classes.control}
                                        onClick={() => navigate("/application")}
                                    >
                                        <FormattedMessage id={locale.buttonApplication} />
                                    </Button>
                                </Group>
                            </Flex>
                            <div className={classes.artwork}>
                                <Image src={image} className={classes.image} alt="" />
                            </div>
                        </Flex>
                    </Container>
                </Flex>
            </ScrollArea>
        </Flex>
    )
}

export default Welcome
