import { MantineColor } from "@mantine/core"
import {
    IconAlignBoxLeftMiddle,
    IconCircleCheck,
    IconCircleX,
    IconMailbox,
    IconMailCheck,
    IconMailFast,
    IconPlayerPause,
    IconProgress,
    IconUserPlus,
    IconUserQuestion,
} from "@tabler/icons-react"

export enum ApplicationStatus {
    CREATED = "CREATED",
    IN_PROGRESS = "IN_PROGRESS",
    CLARIFICATION = "CLARIFICATION",
    PAUSED = "PAUSED",
    READY_TO_SEND = "READY_TO_SEND",
    DOCS_SENT = "DOCS_SENT",
    DOCS_RECEIVED = "DOCS_RECEIVED",
    DONE = "DONE",
    DENY = "DENY",
}

export const getApplicationStatusIcon = (status: string, size: number = 16, color?: MantineColor) => {
    switch (status) {
        case ApplicationStatus.CREATED:
            return <IconUserPlus size={size} color={color} />
        case ApplicationStatus.IN_PROGRESS:
            return <IconProgress size={size} color={color} />
        case ApplicationStatus.CLARIFICATION:
            return <IconUserQuestion size={size} color={color} />
        case ApplicationStatus.PAUSED:
            return <IconPlayerPause size={size} color={color} />
        case ApplicationStatus.READY_TO_SEND:
            return <IconMailbox size={size} color={color} />
        case ApplicationStatus.DOCS_SENT:
            return <IconMailFast size={size} color={color} />
        case ApplicationStatus.DOCS_RECEIVED:
            return <IconMailCheck size={size} color={color} />
        case ApplicationStatus.DONE:
            return <IconCircleCheck size={size} color={color} />
        case ApplicationStatus.DENY:
            return <IconCircleX size={size} color={color} />
        default:
            return <IconAlignBoxLeftMiddle size={size} color={color} />
    }
}

export const getApplicationStatusColor = (status: string): MantineColor | undefined => {
    switch (status) {
        case ApplicationStatus.CREATED:
            return "gray"
        case ApplicationStatus.IN_PROGRESS:
            return "cyan"
        case ApplicationStatus.CLARIFICATION:
            return "orange"
        case ApplicationStatus.PAUSED:
            return "yellow"
        case ApplicationStatus.DONE:
            return "green"
        case ApplicationStatus.DENY:
            return "red"
        default:
            return undefined
    }
}
