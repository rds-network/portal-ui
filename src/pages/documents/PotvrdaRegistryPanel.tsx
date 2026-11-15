import { Card, Table, Text, TextInput, Title } from "@mantine/core"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { PotvrdaApiService } from "src/shared/api/PotvrdaApiService"
import classes from "./DocumentsPage.module.scss"

export const PotvrdaRegistryPanel = () => {
    const intl = useIntl()
    const [search, setSearch] = useState("")

    const { data, isFetching, refetch } = useQuery({
        queryKey: ["potvrda-issues", search],
        queryFn: () => PotvrdaApiService.list(0, 100, search),
    })

    const rows = data?.content ?? []

    return (
        <Card withBorder radius="md" padding="lg" className={classes.registry}>
            <Title order={4} mb="sm">
                <FormattedMessage id="pages.documents.registry.title" />
            </Title>
            <Text size="sm" c="dimmed" mb="md">
                <FormattedMessage id="pages.documents.registry.subtitle" />
            </Text>
            <TextInput
                placeholder={intl.formatMessage({ id: "pages.documents.registry.search" })}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                onBlur={() => refetch()}
                mb="md"
            />
            <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>
                            <FormattedMessage id="pages.documents.registry.number" />
                        </Table.Th>
                        <Table.Th>
                            <FormattedMessage id="pages.documents.registry.volunteer" />
                        </Table.Th>
                        <Table.Th>
                            <FormattedMessage id="pages.documents.registry.kind" />
                        </Table.Th>
                        <Table.Th>
                            <FormattedMessage id="pages.documents.registry.hours" />
                        </Table.Th>
                        <Table.Th>
                            <FormattedMessage id="pages.documents.registry.issued" />
                        </Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.length === 0 && (
                        <Table.Tr>
                            <Table.Td colSpan={5}>
                                <Text c="dimmed" size="sm">
                                    {isFetching ? (
                                        <FormattedMessage id="design.loading" />
                                    ) : (
                                        <FormattedMessage id="pages.documents.registry.empty" />
                                    )}
                                </Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                    {rows.map((row) => (
                        <Table.Tr key={row.id}>
                            <Table.Td>{row.confirmNumber}</Table.Td>
                            <Table.Td>
                                {row.volunteerFullName}
                                <Text size="xs" c="dimmed">
                                    {row.volunteerUsername}
                                </Text>
                            </Table.Td>
                            <Table.Td>{row.kind}</Table.Td>
                            <Table.Td>{row.totalHours ?? "—"}</Table.Td>
                            <Table.Td>
                                {dayjs(row.issueDate).format("DD.MM.YYYY")}
                                <Text size="xs" c="dimmed">
                                    {row.issuedBy}
                                </Text>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Card>
    )
}
