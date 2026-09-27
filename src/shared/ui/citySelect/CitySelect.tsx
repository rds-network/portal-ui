import { Autocomplete, AutocompleteProps } from "@mantine/core"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useIntl } from "react-intl"
import { CitiesApiService } from "src/shared/api/CitiesApiService"

const isCyrillic = (text: string): boolean => {
    return /[\u0400-\u04FF]/.test(text)
}

export const CitySelect = ({ onChange, value, ...props }: AutocompleteProps) => {
    const intl = useIntl()
    const [search, setSearch] = useState<string>("")

    const skipSearchRef = useRef<boolean>(false)

    const { data: cities = [] } = useQuery({
        queryKey: ["cities"],
        queryFn: () => CitiesApiService.getCities().then((response) => response.data),
    })

    const cityOptions = useMemo(() => {
        return cities.map((city) => (isCyrillic(search) ? city.nameCyrillic : city.name))
    }, [cities, search])

    const handleChange = useCallback(
        (newValue: string) => {
            setSearch(newValue)
            if (!cities.length) return

            const city = cities.find((c) => c.name === newValue || c.nameCyrillic === newValue)

            if (city) {
                onChange?.(city.name)
                skipSearchRef.current = true
            } else {
                onChange?.(newValue)
            }
        },
        [cities, onChange]
    )

    useEffect(() => {
        if (!value || value === search) return

        if (skipSearchRef.current) {
            skipSearchRef.current = false
            return
        }

        setSearch(value)
    }, [value, search])

    return (
        <Autocomplete
            {...props}
            placeholder={intl.formatMessage({ id: "common.city-select.placeholder" })}
            value={search}
            data={cityOptions}
            onChange={handleChange}
        />
    )
}
