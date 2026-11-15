import { Alert } from "@mantine/core"
import { useContext } from "react"
import { FormattedMessage } from "react-intl"
import { UserContext } from "src/app/providers/UserContext"
import { Form } from "src/pages/application/form/Form"
import { hasPermission } from "src/shared/user/roles"

const FormPreview = () => {
    const { user } = useContext(UserContext)

    if (!hasPermission(user, ["ADMIN_VOLUNTEER", "INTERVIEWER"])) {
        return (
            <Alert color="red">
                <FormattedMessage id="pages.application.form.preview-forbidden" />
            </Alert>
        )
    }

    return <Form preview />
}

export default FormPreview
