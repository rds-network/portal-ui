import { TaskDto } from "@rds-network/portal-api-axios"
import { v4 as uuid } from "uuid"

export const defaultTask: TaskDto = {
    id: uuid(),
    date: Date(),
    name: "",
    description: "",
    timeSpent: 0,
    result: "",
    files: [],
    customer: null,
}
