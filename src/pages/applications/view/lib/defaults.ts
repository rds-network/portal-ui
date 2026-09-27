import { ApplicationDto } from "@rds-network/portal-api-axios"
import { v4 } from "uuid"

export const defaultApplicationDto: ApplicationDto = {
    id: v4(),
}
