import { TaskDto } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"

export const allTasksInOneWeek = (tasks: TaskDto[]): boolean => {
    const week = dayjs(tasks[0].date).isoWeek()
    for (let i = 1; i < tasks.length; i++) {
        if (dayjs(tasks[i].date).isoWeek() != week) {
            return false
        }
    }
    return true
}
