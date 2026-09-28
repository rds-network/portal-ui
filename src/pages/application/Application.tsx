import { Flex } from "@mantine/core"
import { useState } from "react"
import { Navigate } from "react-router"
import { Terms } from "src/pages/application/terms/Terms"
import { setDocumentTitleByString } from "src/shared/hooks/useDocumentTitle"
import classes from "./Application.module.scss"

const APPLICATION_TITLE = "Присоединяйтесь к команде Русской диаспоры в Сербии"

export const Application = () => {
    const [termsAccepted, setTermsAccepted] = useState(false)

    setDocumentTitleByString(APPLICATION_TITLE)

    if (!termsAccepted) {
        return (
            <Flex className={classes.root}>
                <Terms onAccepted={() => setTermsAccepted(true)} />
            </Flex>
        )
    }

    return <Navigate to="/application/form" replace={true} />
}

export default Application
