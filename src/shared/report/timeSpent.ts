import { ReportDto, TaskDto } from "@rds-network/portal-api-axios"
import { IntlShape } from "react-intl"
import { locales } from "src/pages/report/lib/locales"

export const getSpentTimeFromReport = (report: ReportDto, intl: IntlShape): string => {
    return getSpentTimeFromTasks(report.tasks, intl)
}

export const getSpentTimeFromTasks = (tasks: TaskDto[], intl: IntlShape): string => {
    const timeInMinutes = tasks.map((it) => it.timeSpent).reduce((acc, val) => acc + val, 0)
    return getSpentTime(timeInMinutes, intl)
}

export const getSpentTime = (timeInMinutes: number, intl: IntlShape): string => {
    const hours = Math.floor(timeInMinutes / 60)
    const minutes = timeInMinutes % 60

    const hoursText = intl.formatMessage({ id: locales.timeSpentHours }, { h: hours })
    const minutesText = intl.formatMessage({ id: locales.timeSpentMinutes }, { m: minutes })

    if (minutes) {
        return `${hoursText} ${minutesText}`
    } else {
        return hoursText
    }
}

export const getSpentTimeObjectFromReport = (report: ReportDto): { h: number; m: number } => {
    const timeInMinutes = report.tasks.map((it) => it.timeSpent).reduce((acc, val) => acc + val, 0)
    return getSpentTimeObject(timeInMinutes)
}

export const getSpentTimeObject = (timeInMinutes: number): { h: number; m: number } => {
    const hours = Math.floor(timeInMinutes / 60)
    const minutes = timeInMinutes % 60
    return { h: hours, m: minutes }
}
