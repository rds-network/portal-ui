import { FilesApiService } from "src/shared/api/FilesApiService"
import { InboxApiService } from "src/shared/api/InboxApiService"

export async function sendPotvrdaToInbox(params: {
    blob: Blob
    fileName: string
    volunteerUsername: string
    confirmNumber: string
    volunteerFullName: string
}): Promise<void> {
    const file = new File([params.blob], params.fileName, {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
    const uploaded = await FilesApiService.uploadFile(file)
    const link = uploaded.data.link
    const body = [
        `Потврда о volontiranju број ${params.confirmNumber} для ${params.volunteerFullName}.`,
        "",
        `Preuzmite dokument: ${link}`,
        "",
        "Файл также доступен по ссылке из личного кабинета (Сообщения).",
    ].join("\n")

    await InboxApiService.create({
        subject: `Potvrda o volontiranju ${params.confirmNumber}`,
        body,
        recipients: [params.volunteerUsername],
    })
}
