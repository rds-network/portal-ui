import { ApplicationDto } from "@rds-network/portal-api-axios"
import dayjs from "dayjs"
import { DEFAULT_DATE_FORMAT } from "src/shared/datetime/formats"

export const mapValuesToRequest = (values: Record<string, any>, currentState: ApplicationDto): ApplicationDto => {
    const request = { ...currentState }
    if (values["email"]) {
        request.email = values["email"]
    }
    if (values["name"]) {
        request.name = values["name"]
    }
    if (values["patronymic"]) {
        request.patronymic = values["patronymic"]
    }
    if (values["birthDate"]) {
        request.birthDate = dayjs(values["birthDate"]).format(DEFAULT_DATE_FORMAT)
    }
    if (values["passport"]) {
        request.passport = values["passport"]
    }
    if (values["citizenship"]) {
        request.citizenship = values["citizenship"]
    }
    if (values["telegram"]) {
        request.telegram = values["telegram"]
    }
    if (values["enterDate"]) {
        request.enterDate = dayjs(values["enterDate"]).format(DEFAULT_DATE_FORMAT)
    }
    if (values["city"]) {
        request.city = values["city"]
    }
    if (values["postalCode"]) {
        request.postalCode = values["postalCode"]
    }
    if (values["address"]) {
        request.address = values["address"]
    }
    if (values["phone"]) {
        request.phone = values["phone"]
    }
    if (values["occupation"]) {
        request.occupation = values["occupation"]
    }
    delete request.program
    delete request.project
    if (values["experience"]) {
        request.experience = values["experience"]
    }
    if (values["languages"]) {
        request.languages = values["languages"]
    }
    if (values["skills"]) {
        request.skills = values["skills"]
    }
    if (values["goal"]) {
        request.goal = values["goal"]
    }
    if (values["bio"]) {
        request.bio = values["bio"]
    }
    if (values["gender"]) {
        ;(request as any).gender = values["gender"]
    }
    return request
}
