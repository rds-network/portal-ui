import { ApplicationDto } from "@rds-network/portal-api-axios"
import { v4 as uuid } from "uuid"

export const defaultRequest: ApplicationDto = {
    id: uuid(),
}
