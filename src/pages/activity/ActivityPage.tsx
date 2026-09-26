import { Anchor, Button, Card, Flex, Loader, ScrollArea, Table, Text, TextInput, Title } from "@mantine/core"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useContext, useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import { Link, useNavigate } from "react-router"
import { UserContext } from "src/app/providers/UserContext"
import { ActivityApiService } from "src/shared/api/ActivityApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { hasPermission, UserGroup } from "src/shared/user/roles"
import classes from "./ActivityPage.module.scss"

const MANAGERS = [UserGroup.ADMIN, UserGroup.ADMIN_SSO]

const pathLabel = (path: string, query?: string | null) => {
    if (!query) return path
    return `${path}?${query}`
}

export const ActivityPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const navigate = useNavigate()
    const [search, setSearch] = useState("")
    const [q, setQ] = useState("")
    const [sort, setSort] = useState("createTime")
    const [dir, setDir] = useState<"asc" | "desc">("desc")
    const [page, setPage] = useState(0)

    setDocumentTitleByLocale("pages.activity.title")

    useEffect(() => {
        if (!hasPermission(user, MANAGERS)) {
            navigate("/unauthorized", { replace: true })
        }
    }, [user, navigate])

    const { data, isFetching } = useQuery({
        queryKey: ["activity", q, sort, dir, page],
        queryFn: () => ActivityApiService.list({ q, sort, dir, page, size: 50 }),
    })

    const { data: online } = useQuery({
        queryKey: ["activity-online"],
        queryFn: () => ActivityApiService.online(10),
        refetchInterval: 30_000,
    })

    const { data: apiVersion } = useQuery({
        queryKey: ["meta-api-version"],
        queryFn: () => ActivityApiService.apiVersion(),
        staleTime: 60_000,
    })

    const { data: uiVersion } = useQuery({
        queryKey: ["meta-ui-version"],
        queryFn: () => ActivityApiService.uiVersion(),
        staleTime: 60_000,
    })

    const toggle = (field: string) => {
        if (sort === field) setDir((prev) => (prev === "asc" ? "desc" : "asc"))
        else {
            setSort(field)
            setDir("desc")
        }
        setPage(0)
    }

    const rows = data?.content ?? []
    const people = online?.people ?? []

    return (
        <Flex className={classes.root} direction="column" gap="lg">
            <div>
                <Title order={2}>
                    <FormattedMessage id="pages.activity.title" />
                </Title>
                <div className={classes.versions}>
                    <div className={classes.versionPill}>
                        UI #{uiVersion?.build ?? "…"} · {uiVersion?.sha ?? "…"}
                    </div>
                    <div className={classes.versionPill}>
                        API #{apiVersion?.build ?? "…"} · {apiVersion?.sha ?? "…"}
                    </div>
                </div>
                <Text c="dimmed" mt={6}>
                    <FormattedMessage id="pages.activity.description" />
                </Text>
            </div>

            <Card withBorder p="lg" radius="lg" className={classes.onlineCard}>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={4}>
                    <FormattedMessage id="pages.activity.onlineLabel" />
                </Text>
                <Title order={4} mb={4}>
                    <FormattedMessage id="pages.activity.onlineTitle" values={{ count: online?.total ?? 0 }} />
                </Title>
                <Text size="sm" c="dimmed" mb="sm">
                    <FormattedMessage
                        id="pages.activity.onlineBreakdown"
                        values={{ loggedIn: online?.loggedIn ?? 0, guests: online?.guests ?? 0 }}
                    />
                </Text>
                <ScrollArea h={180} type="auto" offsetScrollbars>
                    {people.length === 0 ? (
                        <Text size="sm" c="dimmed">
                            <FormattedMessage id="pages.activity.onlineEmpty" />
                        </Text>
                    ) : (
                        <Flex direction="column" gap={10}>
                            {people.map((person, index) => (
                                <div key={`${person.username || person.ip || "g"}-${index}`} className={classes.onlineRow}>
                                    <Text size="sm" fw={600}>
                                        {person.username ? (
                                            <Anchor component={Link} to={`/profile/${person.username}`}>
                                                {person.displayName}
                                            </Anchor>
                                        ) : (
                                            person.displayName
                                        )}
                                        {person.self ? (
                                            <Text span c="dimmed" fw={500}>
                                                {" "}
                                                <FormattedMessage id="pages.activity.onlineYou" />
                                            </Text>
                                        ) : null}
                                        <Text span fw={500}>
                                            {" "}
                                            — {pathLabel(person.path, person.query)}
                                        </Text>
                                    </Text>
                                    {person.ip ? (
                                        <Text size="xs" c="dimmed">
                                            {person.ip}
                                        </Text>
                                    ) : null}
                                </div>
                            ))}
                        </Flex>
                    )}
                </ScrollArea>
            </Card>

            <Card withBorder p="lg" radius="lg">
                <Flex gap="sm" mb="md" wrap="wrap">
                    <TextInput
                        placeholder="логин, IP, путь"
                        value={search}
                        onChange={(event) => setSearch(event.currentTarget.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                setQ(search.trim())
                                setPage(0)
                            }
                        }}
                        style={{ flex: 1, minWidth: 220 }}
                    />
                    <Button
                        onClick={() => {
                            setQ(search.trim())
                            setPage(0)
                        }}
                    >
                        <FormattedMessage id="common.filters" />
                    </Button>
                </Flex>
                {isFetching && rows.length === 0 ? (
                    <Flex align="center" gap="sm">
                        <Loader size="sm" />
                        <Text c="dimmed">
                            <FormattedMessage id="pages.activity.loading" />
                        </Text>
                    </Flex>
                ) : (
                    <Table highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ cursor: "pointer" }} onClick={() => toggle("createTime")}>
                                    <FormattedMessage id="pages.activity.time" />
                                </Table.Th>
                                <Table.Th style={{ cursor: "pointer" }} onClick={() => toggle("username")}>
                                    <FormattedMessage id="pages.activity.who" />
                                </Table.Th>
                                <Table.Th style={{ cursor: "pointer" }} onClick={() => toggle("ip")}>
                                    IP
                                </Table.Th>
                                <Table.Th style={{ cursor: "pointer" }} onClick={() => toggle("action")}>
                                    <FormattedMessage id="pages.activity.what" />
                                </Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {rows.map((item) => (
                                <Table.Tr key={item.id}>
                                    <Table.Td>{dayjs(item.createTime).format("DD.MM.YYYY HH:mm:ss")}</Table.Td>
                                    <Table.Td>
                                        {item.username ? (
                                            <Anchor component={Link} to={`/profile/${item.username}`}>
                                                {item.username}
                                            </Anchor>
                                        ) : (
                                            "гость"
                                        )}
                                    </Table.Td>
                                    <Table.Td>{item.ip || "—"}</Table.Td>
                                    <Table.Td>
                                        {item.link ? (
                                            <Anchor component={Link} to={item.link}>
                                                {item.action}
                                            </Anchor>
                                        ) : (
                                            item.action
                                        )}
                                        <Text size="xs" c="dimmed">
                                            {item.method} {item.path}
                                            {item.query ? `?${item.query}` : ""}
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
                <Flex justify="space-between" mt="md">
                    <Text size="sm" c="dimmed">
                        {data?.total ?? 0}
                    </Text>
                    <Flex gap="sm">
                        <Button variant="light" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                            ←
                        </Button>
                        <Button
                            variant="light"
                            disabled={(page + 1) * (data?.size ?? 50) >= (data?.total ?? 0)}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            →
                        </Button>
                    </Flex>
                </Flex>
            </Card>
        </Flex>
    )
}

export default ActivityPage
