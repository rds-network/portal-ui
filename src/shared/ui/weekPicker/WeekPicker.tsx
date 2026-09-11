import { CloseButton, Flex, Input, Popover, Text } from "@mantine/core"
import { DatePicker, DatePickerProps } from "@mantine/dates"
import { IconCalendar } from "@tabler/icons-react"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import classes from "./WeekPicker.module.scss"

interface WeekPickerProps {
    className?: string
    onChange?: (week: number | null, start: Date | null, end: Date | null) => void
    initialStartDate?: string | null
    initialEndDate?: string | null
}

export const WeekPicker = (props: WeekPickerProps) => {
    const [value, setValue] = useState<[Date | null, Date | null]>([null, null])
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

    useEffect(() => {
        const startDate = dayjs(props.initialStartDate)
        const endDate = dayjs(props.initialEndDate)
        if (startDate.isValid() && endDate.isValid()) {
            const week = dayjs(startDate).isoWeek()

            setValue([startDate.toDate(), endDate.toDate()])
            setSelectedWeek(week)
        } else {
            setValue([null, null])
            setSelectedWeek(null)
        }
    }, [props.initialStartDate, props.initialEndDate])

    useEffect(() => {
        if (props.onChange) {
            props.onChange(selectedWeek, value[0], value[1])
        }
    }, [selectedWeek])

    const dayRenderer: DatePickerProps["renderDay"] = (date) => {
        const day = date.getDate()
        const weekDay = date.getDay()
        const weekNumber = dayjs(date).isoWeek()
        return (
            <Flex className={classes.dayContainer}>
                {weekDay == 1 && <div className={classes.weekNumber}>{weekNumber}</div>}
                <div className={classes.firstDay}>{day}</div>
            </Flex>
        )
    }

    const onChange = (range: [Date | null, Date | null]) => {
        const date = range[0]
        if (!date) {
            setSelectedWeek(null)
        } else {
            const year = dayjs(date).year()
            const week = dayjs(date).isoWeek()
            const startOfWeek = dayjs().year(year).isoWeek(week).startOf("isoWeek").toDate()
            const endOfWeek = dayjs().year(year).isoWeek(week).endOf("isoWeek").toDate()
            setValue([startOfWeek, endOfWeek])
            setSelectedWeek(week)
        }
    }

    const placeholder = value[0] ? (
        <Text className={classes.text} truncate="end">
            {`${selectedWeek}: ${dayjs(value[0]).format("DD MMM")} - ${dayjs(value[1]).format("DD MMM")}`}
        </Text>
    ) : (
        <Text className={classes.placeholder} size="sm">
            <FormattedMessage id="common.week-picker.empty" />
        </Text>
    )

    return (
        <Popover position="bottom" withArrow shadow="md">
            <Popover.Target>
                <Flex direction="column" rowGap={4}>
                    <Text size="xs" c="dimmed">
                        <FormattedMessage id="common.week-picker.label" />
                    </Text>
                    <Input
                        size="sm"
                        className={`${classes.input} ${props.className}`}
                        component="button"
                        pointer
                        rightSectionPointerEvents="all"
                        leftSection={<IconCalendar size={16} />}
                        rightSection={
                            <CloseButton
                                aria-label="Clear input"
                                onClick={() => {
                                    setSelectedWeek(null)
                                    setValue([null, null])
                                }}
                                style={{ display: selectedWeek ? undefined : "none" }}
                            />
                        }
                    >
                        {placeholder}
                    </Input>
                </Flex>
            </Popover.Target>
            <Popover.Dropdown>
                <DatePicker
                    renderDay={dayRenderer}
                    className={classes.calendar}
                    type="range"
                    size="xs"
                    maxLevel="month"
                    value={value}
                    onChange={onChange}
                />
            </Popover.Dropdown>
        </Popover>
    )
}
