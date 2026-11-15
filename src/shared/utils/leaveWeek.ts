import dayjs from "dayjs"

/** Неделя целиком в согласованном отпуске. Норма часов при этом не обнуляется. */
export function weekFullyOnLeave(weekStart?: string | null, weekEnd?: string | null, leaveDays?: number | null) {
    const days = leaveDays ?? 0
    if (days <= 0 || !weekStart) return false
    const start = dayjs(weekStart)
    const end = weekEnd ? dayjs(weekEnd) : start.add(6, "day")
    const span = Math.max(1, end.startOf("day").diff(start.startOf("day"), "day") + 1)
    return days >= span
}
