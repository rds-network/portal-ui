import { TaskDto } from "@rds-network/portal-api-axios"
import { useEffect, useState } from "react"
import { defaultTask } from "src/pages/reportEdit/lib/defaults"

const REPORT_DRAFT_STORAGE_KEY = "reportDraft"

export const useReportDraft = (editMode: boolean) => {
    const getTasksFromDraft = () => {
        if (!editMode) {
            const savedDraft = localStorage.getItem(REPORT_DRAFT_STORAGE_KEY)
            if (savedDraft) {
                try {
                    const parsedTasks = JSON.parse(savedDraft)
                    if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
                        return parsedTasks
                    }
                } catch (error) {
                    console.error("Failed to parse report draft from localStorage", error)
                    localStorage.removeItem(REPORT_DRAFT_STORAGE_KEY)
                    window.location.reload()
                }
            }
        }

        return [defaultTask]
    }

    const [tasks, setTasks] = useState<TaskDto[]>(() => {
        return getTasksFromDraft()
    })

    useEffect(() => {
        if (editMode) return
        setTasks(getTasksFromDraft())
    }, [editMode])

    useEffect(() => {
        if (!editMode) {
            try {
                localStorage.setItem(REPORT_DRAFT_STORAGE_KEY, JSON.stringify(tasks))
            } catch (error) {
                console.error("Failed to save report draft to localStorage", error)
            }
        }
    }, [tasks, editMode])

    const clearDraft = () => {
        if (!editMode) {
            localStorage.removeItem(REPORT_DRAFT_STORAGE_KEY)
        }
    }

    const saveDraft = (tasks: TaskDto[]) => {
        if (!editMode) {
            try {
                localStorage.setItem(REPORT_DRAFT_STORAGE_KEY, JSON.stringify(tasks))
            } catch (error) {
                console.error("Failed to save report draft to localStorage", error)
            }
        }
    }

    return { tasks, setTasks, clearDraft, saveDraft }
}
