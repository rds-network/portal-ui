import { Table, Text } from "@mantine/core"
import { FormattedMessage, useIntl } from "react-intl"
import type { CityStatistics, CityStatItem } from "@rds-network/portal-api-axios"
import { Locale } from "src/shared/constants/Locales"
import { locales } from "../lib/locales"
import classes from "./MintrudReport.module.scss"
import { CityStatsChart } from "./MintrudCharts"

const TOP_CITIES = 10

export default function CityStats({ data }: { data?: CityStatistics }) {
    const intl = useIntl()

    // totalCount и items приходят из разных запросов бэкенда, поэтому пустота — это отсутствие обоих:
    // строки при totalCount = 0 означают расхождение, и его надо показать, а не спрятать
    if (!data || (!data.totalCount && !data.items.length)) return null

    const cityName = ({ code, name, nameCyrillic }: CityStatItem) =>
        (intl.locale === Locale.RU ? nameCyrillic ?? name : name) ?? code ?? intl.formatMessage({ id: locales.cityOther })

    // порядок с сервера: count DESC, сводная запись «прочее» последней — не пересортировываем
    const items = data.items
    const inCitiesCount = items.reduce((sum, item) => sum + item.count, 0)

    const chartData = items
        .filter((item) => item.code)
        .slice(0, TOP_CITIES)
        .map((item) => ({ name: cityName(item), value: item.count }))

    return (
        <>
            <Text mt="lg" fw={600}>
                <FormattedMessage id={locales.cityStats} />
            </Text>

            <Table className={classes.table} withColumnBorders striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>
                            <FormattedMessage id={locales.city} />
                        </Table.Th>
                        <Table.Th ta="right">
                            <FormattedMessage id={locales.volunteers} />
                        </Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {items.map((item) => (
                        <Table.Tr key={item.code ?? "OTHER"}>
                            <Table.Td>{cityName(item)}</Table.Td>
                            <Table.Td ta="right">{intl.formatNumber(item.count)}</Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
                <Table.Tfoot>
                    <Table.Tr>
                        <Table.Th>
                            <FormattedMessage id={locales.byCities} />
                        </Table.Th>
                        <Table.Th ta="right">{intl.formatNumber(inCitiesCount)}</Table.Th>
                    </Table.Tr>
                    <Table.Tr>
                        <Table.Th>
                            <FormattedMessage id={locales.withoutCity} />
                        </Table.Th>
                        <Table.Th ta="right">{intl.formatNumber(data.withoutCityCount)}</Table.Th>
                    </Table.Tr>
                    <Table.Tr>
                        <Table.Th>
                            <FormattedMessage id={locales.total} />
                        </Table.Th>
                        <Table.Th ta="right">{intl.formatNumber(data.totalCount)}</Table.Th>
                    </Table.Tr>
                </Table.Tfoot>
            </Table>

            <CityStatsChart data={chartData} />
        </>
    )
}
