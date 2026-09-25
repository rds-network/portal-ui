import { Accordion, Anchor, Button, Card, Flex, Radio, Text, TextInput, Title } from "@mantine/core"
import React, { useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import LocalizedMarkdown from "src/shared/ui/markdown/LocalizedMarkdown"
import classes from "./CleanCityCourse.module.scss"

const NAME_KEY = "cleanCityCourseName"
const DONE_KEY = "cleanCityCourseDone"

type Question = {
    id: string
    question: string
    options: { value: string; label: string }[]
    answer: string
}

type Module = {
    id: string
    title: string
    summary: string
    markdown?: string
    extra?: React.ReactNode
    questions: Question[]
}

export const CleanCityCourse: React.FC = () => {
    const intl = useIntl()
    const [name, setName] = useState(() => {
        try {
            return localStorage.getItem(NAME_KEY) || ""
        } catch {
            return ""
        }
    })
    const [done, setDone] = useState<number>(() => {
        try {
            return Number(localStorage.getItem(DONE_KEY) || 0)
        } catch {
            return 0
        }
    })
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [error, setError] = useState<string | null>(null)
    const [open, setOpen] = useState<string | null>(done >= 4 ? "4" : String(Math.min(done + 1, 4)))

    const modules: Module[] = useMemo(
        () => [
            {
                id: "1",
                title: intl.formatMessage({ id: "pages.reporting.course.m1.title" }),
                summary: intl.formatMessage({ id: "pages.reporting.course.m1.summary" }),
                markdown: "clean-city-basics",
                questions: [
                    {
                        id: "m1q1",
                        question: intl.formatMessage({ id: "pages.reporting.course.m1.q1" }),
                        options: [
                            { value: "5", label: "5" },
                            { value: "10", label: "10" },
                            { value: "20", label: "20" },
                        ],
                        answer: "10",
                    },
                    {
                        id: "m1q2",
                        question: intl.formatMessage({ id: "pages.reporting.course.m1.q2" }),
                        options: [
                            { value: "yes", label: intl.formatMessage({ id: "pages.reporting.course.yes" }) },
                            { value: "no", label: intl.formatMessage({ id: "pages.reporting.course.no" }) },
                        ],
                        answer: "yes",
                    },
                    {
                        id: "m1q3",
                        question: intl.formatMessage({ id: "pages.reporting.course.m1.q3" }),
                        options: [
                            { value: "yes", label: intl.formatMessage({ id: "pages.reporting.course.yes" }) },
                            { value: "no", label: intl.formatMessage({ id: "pages.reporting.course.no" }) },
                        ],
                        answer: "no",
                    },
                ],
            },
            {
                id: "2",
                title: intl.formatMessage({ id: "pages.reporting.course.m2.title" }),
                summary: intl.formatMessage({ id: "pages.reporting.course.m2.summary" }),
                markdown: "clean-city-howto",
                extra: (
                    <Flex direction="column" gap={8}>
                        <Text>
                            <FormattedMessage id="pages.reporting.course.m2.docs" />
                        </Text>
                        <Anchor href="https://ekomapa.rs/docs/clean-city-volunteer.html" target="_blank">
                            ekomapa.rs/docs/clean-city-volunteer.html
                        </Anchor>
                        <Anchor href="https://ekomapa.rs/docs/portal-user.html" target="_blank">
                            ekomapa.rs/docs/portal-user.html
                        </Anchor>
                        <Anchor href="https://ekomapa.rs/docs/portal-curator.html" target="_blank">
                            ekomapa.rs/docs/portal-curator.html
                        </Anchor>
                    </Flex>
                ),
                questions: [
                    {
                        id: "m2q1",
                        question: intl.formatMessage({ id: "pages.reporting.course.m2.q1" }),
                        options: [
                            { value: "after", label: intl.formatMessage({ id: "pages.reporting.course.m2.a1a" }) },
                            { value: "both", label: intl.formatMessage({ id: "pages.reporting.course.m2.a1b" }) },
                            { value: "bags", label: intl.formatMessage({ id: "pages.reporting.course.m2.a1c" }) },
                        ],
                        answer: "both",
                    },
                    {
                        id: "m2q2",
                        question: intl.formatMessage({ id: "pages.reporting.course.m2.q2" }),
                        options: [
                            { value: "attach", label: intl.formatMessage({ id: "pages.reporting.course.m2.a2a" }) },
                            { value: "cloud", label: intl.formatMessage({ id: "pages.reporting.course.m2.a2b" }) },
                        ],
                        answer: "cloud",
                    },
                ],
            },
            {
                id: "3",
                title: intl.formatMessage({ id: "pages.reporting.course.m3.title" }),
                summary: intl.formatMessage({ id: "pages.reporting.course.m3.summary" }),
                markdown: "clean-city-projects",
                questions: [
                    {
                        id: "m3q1",
                        question: intl.formatMessage({ id: "pages.reporting.course.m3.q1" }),
                        options: [
                            { value: "only-clean", label: intl.formatMessage({ id: "pages.reporting.course.m3.a1a" }) },
                            { value: "more", label: intl.formatMessage({ id: "pages.reporting.course.m3.a1b" }) },
                        ],
                        answer: "more",
                    },
                ],
            },
            {
                id: "4",
                title: intl.formatMessage({ id: "pages.reporting.course.m4.title" }),
                summary: intl.formatMessage({ id: "pages.reporting.course.m4.summary" }),
                markdown: "clean-city-opportunities",
                extra: (
                    <Anchor href="https://edu.russian.rs/" target="_blank">
                        edu.russian.rs
                    </Anchor>
                ),
                questions: [
                    {
                        id: "m4q1",
                        question: intl.formatMessage({ id: "pages.reporting.course.m4.q1" }),
                        options: [
                            { value: "paid", label: intl.formatMessage({ id: "pages.reporting.course.m4.a1a" }) },
                            { value: "free", label: intl.formatMessage({ id: "pages.reporting.course.m4.a1b" }) },
                        ],
                        answer: "free",
                    },
                ],
            },
        ],
        [intl]
    )

    const saveProgress = (next: number) => {
        setDone(next)
        localStorage.setItem(DONE_KEY, String(next))
    }

    const submitModule = (module: Module, index: number) => {
        if (index === 0 && name.trim().length < 2) {
            setError(intl.formatMessage({ id: "pages.reporting.course.name" }))
            return
        }
        const wrong = module.questions.some((item) => answers[item.id] !== item.answer)
        if (wrong) {
            setError(intl.formatMessage({ id: "pages.reporting.course.retry" }))
            return
        }
        setError(null)
        const next = Math.max(done, index + 1)
        saveProgress(next)
        setOpen(next >= 4 ? "4" : String(next + 1))
    }

    return (
        <Flex direction="column" gap="lg" className={classes.course}>
            <Card withBorder p="lg" radius="lg">
                <Text size="sm" c="dimmed" mb={6}>
                    <FormattedMessage id="pages.reporting.course.kicker" />
                </Text>
                <Title order={3}>
                    <FormattedMessage id="pages.reporting.course.title" />
                </Title>
                <Text mt="sm">
                    <FormattedMessage id="pages.reporting.course.intro" />
                </Text>
                <TextInput
                    mt="md"
                    label={<FormattedMessage id="pages.reporting.course.name" />}
                    value={name}
                    onChange={(event) => {
                        const value = event.currentTarget.value
                        setName(value)
                        localStorage.setItem(NAME_KEY, value)
                    }}
                />
                <Text size="sm" c="dimmed" mt={8}>
                    <FormattedMessage id="pages.reporting.course.how" />
                </Text>
            </Card>

            {done >= 4 && (
                <Card withBorder p="lg" radius="lg" className={classes.done}>
                    <Text fw={650}>
                        <FormattedMessage
                            id="pages.reporting.course.finished"
                            values={{ name: name.trim() || intl.formatMessage({ id: "pages.reporting.course.friend" }) }}
                        />
                    </Text>
                </Card>
            )}

            <Accordion value={open} onChange={setOpen} variant="separated" radius="lg">
                {modules.map((module, index) => {
                    const locked = index > done
                    return (
                        <Accordion.Item key={module.id} value={module.id}>
                            <Accordion.Control disabled={locked}>
                                <Text fw={650}>
                                    {module.id}. {module.title}
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {module.summary}
                                </Text>
                            </Accordion.Control>
                            <Accordion.Panel>
                                {module.markdown && <LocalizedMarkdown id={module.markdown} className={classes.md} />}
                                {module.extra && <div className={classes.extra}>{module.extra}</div>}
                                <Flex direction="column" gap="md" mt="lg">
                                    {module.questions.map((item) => (
                                        <Radio.Group
                                            key={item.id}
                                            label={item.question}
                                            value={answers[item.id] || ""}
                                            onChange={(value) =>
                                                setAnswers((prev) => ({ ...prev, [item.id]: value }))
                                            }
                                        >
                                            <Flex direction="column" gap={6} mt={8}>
                                                {item.options.map((option) => (
                                                    <Radio key={option.value} value={option.value} label={option.label} />
                                                ))}
                                            </Flex>
                                        </Radio.Group>
                                    ))}
                                    {error && open === module.id && (
                                        <Text size="sm" c="red">
                                            {error}
                                        </Text>
                                    )}
                                    <Button w="fit-content" onClick={() => submitModule(module, index)}>
                                        <FormattedMessage id="pages.reporting.course.check" />
                                    </Button>
                                </Flex>
                            </Accordion.Panel>
                        </Accordion.Item>
                    )
                })}
            </Accordion>

            <Card withBorder p="lg" radius="lg">
                <Title order={4}>
                    <FormattedMessage id="pages.reporting.course.contacts" />
                </Title>
                <Text mt="sm">
                    <FormattedMessage id="pages.reporting.course.contactLead" /> @Giktom
                </Text>
                <Text>
                    <FormattedMessage id="pages.reporting.course.contactEkomapa" /> @glebovic
                </Text>
            </Card>
        </Flex>
    )
}
