import { ApplicationStatusDto } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"

export const defaultApplicationStatus: ApplicationStatusDto = {
    id: "",
    status: "CREATED",
    progress: 0,
    terminated: false,
    lastUpdate: dayjs().format(DEFAULT_DATE_FORMAT),
}
