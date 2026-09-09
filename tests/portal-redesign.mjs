// Local UI regression checks. Every API request is intercepted; no live data is used.
import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3017"
const output = process.env.TEST_OUTPUT_DIR || "/tmp/portal-redesign"
await mkdir(output, { recursive: true })
const avatar =
    "data:image/svg+xml," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="24" fill="#b7d8d0"/><text x="40" y="52" text-anchor="middle" font-size="32" fill="#285855">ЕП</text></svg>'
    )
const user = {
    id: 1,
    username: "elena",
    fullName: "Елена Петрова",
    email: "elena@example.com",
    groups: ["ADMIN_VOLUNTEER", "ADMIN"],
    avatar: { link: avatar },
    city: "Belgrade",
    postalCode: "11000",
    address: "Test Street",
    birthDate: "1990-01-01",
    telegram: "elena",
    phone: "+3811111111",
    gender: "FEMALE",
    program: { code: "IT", name: "IT", nameRu: "IT" },
    project: { code: "PORTAL", name: "Portal", nameRu: "Портал" },
    contracts: [],
    residencePermits: [],
}
const task = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Подготовка материалов для встречи",
    description: "Подготовила материалы, проверила список участников и согласовала программу встречи.",
    date: "2026-09-02",
    timeSpent: 180,
    result: "https://example.com/result",
    customer: "elena",
    files: [],
    nameSr: "Priprema materijala za sastanak",
    descriptionSr: "Priprema materijala i programa za sastanak.",
}
const reports = Array.from({ length: 8 }, (_, i) => ({
    id: `22222222-2222-4222-8222-${String(i).padStart(12, "0")}`,
    user: "elena",
    createTime: `2026-09-0${5 - (i % 5)}T12:00:00`,
    week: 36 - i,
    status: ["ACCEPTED", "CREATED", "REJECTED"][i % 3],
    tasks: [task, { ...task, id: "second-task", timeSpent: 120 }],
    program: "IT",
    project: "PORTAL",
    notes: [],
}))
const heatmap = {
    2026: {
        totalWorked: 248,
        totalRequired: 300,
        weeks: Array.from({ length: 36 }, (_, i) => ({
            week: i + 1,
            hoursWorked: [10, 12, 0, 5, 10, 10][i % 6],
            hoursRequired: 10,
            weekStart: "2026-08-31",
            weekEnd: "2026-09-06",
        })),
    },
}
const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || undefined })
try {
    for (const width of [1440, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: "light" })
        await context.addInitScript(() => {
            localStorage.setItem("locale", JSON.stringify("ru"))
        })
        const page = await context.newPage()
        const errors = [],
            writes = [],
            filters = []
        page.on("pageerror", (e) => errors.push(page.url() + ": " + e.message))
        await page.route(`${base}/api/**`, async (route) => {
            const req = route.request(),
                url = new URL(req.url()),
                path = url.pathname.replace(/^\/api/, "")
            const payload = req.headers()["content-type"]?.includes("application/json") ? req.postDataJSON() : null
            let result = []
            if (path === "/user/account" || path.startsWith("/user/info/")) result = user
            else if (path === "/user/resolve") result = [user]
            else if (path === "/announcements/unread-count") result = { count: 0 }
            else if (path === "/files/upload")
                result = { id: "uploaded-file", name: "evidence.txt", link: "https://example.com/evidence.txt" }
            else if (path === "/programs") result = [user.program]
            else if (path === "/projects") result = [user.project]
            else if (path === "/user/search") result = { content: [user], page: { totalElements: 1, totalPages: 1 } }
            else if (path === "/reports/heat-map/currentUser") result = heatmap
            else if (path === "/reports/heat-map") result = { content: [], page: { totalElements: 0, totalPages: 0 } }
            else if (path === "/reports") {
                filters.push(payload)
                const filtered = reports.filter((r) => !payload.status || r.status === payload.status)
                const n = Number(url.searchParams.get("pageNumber") || 0),
                    size = Number(url.searchParams.get("pageSize") || 5)
                result = {
                    content: filtered.slice(n * size, (n + 1) * size),
                    page: {
                        pageNumber: n,
                        pageSize: size,
                        totalElements: filtered.length,
                        totalPages: Math.ceil(filtered.length / size),
                    },
                }
            } else if (path.startsWith("/report/")) result = { ...reports[2], id: path.split("/")[2] }
            else if (path === "/report") {
                writes.push({ method: req.method(), payload })
                result = { ...reports[0], ...payload }
            } else if (path.startsWith("/application/status/"))
                result = { id: "example", status: "CREATED", progress: 20, lastUpdate: "2026-09-01" }
            else if (path === "/application/example")
                result = {
                    id: "example",
                    name: "Анна Иванова",
                    email: "anna@example.com",
                    created: "2026-09-01",
                    status: "CREATED",
                    type: "NEW",
                    notes: [],
                }
            else if (path === "/application/assignees") result = [user]
            else if (path === "/applications") result = { content: [], page: { totalPages: 0, totalElements: 0 } }
            else if (path === "/ticket/groups") result = ["Поддержка"]
            await route.fulfill({ json: result })
        })
        await page.goto(`${base}/login`)
        await page.waitForURL(`${base}/`)
        await page.getByRole("heading", { name: "Мои отчеты", exact: true }).waitFor()
        await page.waitForLoadState("networkidle")
        await page.screenshot({ path: `${output}/reports-${width}.png` })
        // Capture dark mode and ensure the theme toggle is usable with the sidebar closed on mobile.
        await page.getByRole("button", { name: "Switch color scheme" }).click()
        assert.equal(await page.locator("html").getAttribute("data-mantine-color-scheme"), "dark")
        await page.waitForTimeout(300)
        await page.screenshot({ path: `${output}/reports-dark-${width}.png` })
        await page.getByRole("button", { name: "Switch color scheme" }).click()
        await page.getByRole("button", { name: "Статус", exact: true }).click()
        const filteredRequest = page.waitForResponse(
            (res) =>
                new URL(res.url()).pathname === "/api/reports" && res.request().postDataJSON()?.status === "REJECTED"
        )
        await page.getByRole("option", { name: "Отклонен", exact: true }).click()
        await filteredRequest
        await page.waitForURL(/status=REJECTED/)
        await page.waitForLoadState("networkidle")
        assert.equal(filters.at(-1).status, "REJECTED")
        await page.getByRole("button", { name: "Сбросить фильтры", exact: false }).click()
        await page.waitForLoadState("networkidle")
        if (width === 390) {
            await page.getByRole("button", { name: "Навигация", exact: true }).click()
            await page.getByRole("dialog").waitFor()
            await page.getByRole("dialog").getByRole("link", { name: "Новый отчет", exact: true }).click()
            await page.getByRole("dialog").waitFor({ state: "hidden" })
        } else await page.goto(`${base}/report/create`)
        await page.locator('input[name="name"]').waitFor()
        await page.waitForLoadState("networkidle")
        await page.screenshot({ path: `${output}/editor-${width}.png` })
        for (const route of [
            "/reports",
            "/application",
            "/application/form",
            "/application/example",
            "/application-status/example",
            "/volunteers/heatmap",
            "/support",
            "/applications",
            "/volunteers",
            "/profile/elena",
            "/reporting-guide",
            "/cleaning-how-to",
            "/volunteers/reports",
            "/announcements/admin",
            `/report/${reports[2].id}`,
            `/report/${reports[2].id}/edit`,
        ]) {
            await page.goto(base + route)
            await page.waitForLoadState("networkidle")
            const slug = route.split("/").filter(Boolean).join("-")
            await page.screenshot({ path: `${output}/${slug}-${width}.png` })
            assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                `Document overflow at ${route} ${width}`
            )
        }
        assert.deepEqual(writes, [], "Viewing pages must not submit reports")
        // Validate the report flow using mocked writes, including attachment and translation preservation.
        await page.goto(`${base}/report/create`)
        await page.locator('input[name="name"]').waitFor()
        await page.getByRole("button", { name: "Отправить", exact: true }).click()
        assert.equal(writes.length, 0, "Invalid task must not be submitted")
        assert.equal(await page.locator('input[name="name"]').getAttribute("aria-invalid"), "true")
        await page.locator('input[name="name"]').fill(task.name)
        await page.locator('textarea[name="description"]').fill(task.description)
        await page.locator('input[name="timeSpent"]').fill("3")
        await page.locator('input[name="result"]').fill(task.result)
        await page
            .locator('input[type="file"]')
            .setInputFiles({
                name: "evidence.txt",
                mimeType: "text/plain",
                buffer: Buffer.from("Test report evidence"),
            })
        await page.getByText("evidence.txt", { exact: true }).waitFor()
        await page.waitForTimeout(500)
        await page.getByRole("button", { name: "Добавить задачу", exact: true }).click()
        await page.locator('input[name="name"]').nth(1).waitFor()
        await page.waitForTimeout(500)
        assert.equal(
            await page.evaluate(() => JSON.parse(localStorage.getItem("reportDraft"))[0].name),
            task.name,
            "Adding a task preserves the draft"
        )
        await page.getByRole("button", { name: "Удалить задачу", exact: true }).last().click()
        await page.waitForFunction(() => document.querySelectorAll('input[name="name"]').length === 1)
        await page.reload()
        await page.locator('input[name="name"]').waitFor()
        assert.equal(await page.locator('input[name="name"]').inputValue(), task.name, "Draft survives reload")
        await page.getByRole("button", { name: "Добавить задачу", exact: true }).click()
        await page.locator('input[name="name"]').nth(1).waitFor()
        assert.equal(
            await page.locator('input[name="name"]').first().inputValue(),
            task.name,
            "Adding task retains input"
        )
        await page.getByRole("button", { name: "Удалить задачу", exact: true }).last().click()
        await page.waitForFunction(() => document.querySelectorAll('input[name="name"]').length === 1)
        await page.getByRole("button", { name: "Отправить", exact: true }).click()
        await page.getByRole("dialog", { name: "Недостаточно часов" }).waitFor()
        assert.equal(writes.length, 0, "Under ten hours still requires confirmation")
        await page.getByRole("dialog").getByRole("button", { name: "Дозаполнить", exact: true }).click()
        await page.getByRole("dialog").waitFor({ state: "hidden" })
        await page.locator('input[name="timeSpent"]').fill("10")
        await page.getByRole("button", { name: "Отправить", exact: true }).click()
        await page.waitForURL(/\/report\/(?!create)[^/]+$/)
        assert.equal(writes.length, 1)
        assert.equal(writes[0].payload.tasks[0].timeSpent, 600, "Hours remain converted to minutes")
        assert.equal(writes[0].payload.tasks[0].name, task.name)
        assert.equal(writes[0].payload.tasks[0].files[0].id, "uploaded-file")
        assert.equal(await page.evaluate(() => localStorage.getItem("reportDraft")), null, "Submitted draft is cleared")
        await page.goto(`${base}/report/${reports[2].id}/edit`)
        await page.locator('input[name="name"]').first().waitFor()
        await page.waitForLoadState("networkidle")
        await page.locator('input[name="name"]').first().fill("Обновленные материалы для встречи")
        await page.locator('input[name="timeSpent"]').first().fill("10")
        await page.getByRole("button", { name: "Сохранить", exact: true }).click()
        await page.waitForURL(/\/report\/[^/]+$/)
        assert.equal(writes.length, 2)
        assert.equal(writes[1].method, "PUT")
        assert.equal(writes[1].payload.id, reports[2].id)
        assert.equal(writes[1].payload.tasks[0].name, "Обновленные материалы для встречи")
        assert.equal(writes[1].payload.tasks[0].nameSr, task.nameSr, "Existing translation preserved")
        assert.equal(writes[1].payload.tasks.length, 2, "Other tasks preserved")
        assert.deepEqual(errors, [], "No runtime errors")
        console.log(
            `PASS ${width}px: routes, themes, mobile menu, filters, validation, draft, tasks, upload, create/edit payloads, translations`
        )
        await context.close()
    }
} finally {
    await browser.close()
}
