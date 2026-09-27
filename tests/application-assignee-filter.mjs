// Start Vite first; all API traffic is mocked. No live application data is changed.
import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3017"
const output = process.env.TEST_OUTPUT_DIR || "/tmp/portal-assignee-filter-browser"
await mkdir(output, { recursive: true })
const photo =
    "data:image/svg+xml," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#1971c2"/><circle cx="32" cy="24" r="12" fill="#ffe0bd"/><path d="M8 64a24 24 0 0 1 48 0" fill="#ddd"/></svg>'
    )
const employee = {
    id: 1,
    username: "employee",
    fullName: "Elena Petrova",
    email: "elena@example.com",
    groups: ["ADMIN_VOLUNTEER"],
    avatar: { link: photo },
    city: "Belgrade",
    postalCode: "11000",
    address: "Test Street",
    birthDate: "1990-01-01",
    telegram: "elena",
    phone: "+3811111111",
    gender: "FEMALE",
    program: { code: "IT" },
    project: { code: "PORTAL" },
}
const other = {
    ...employee,
    id: 2,
    username: "interviewer",
    fullName: "Ivan Ivanov",
    groups: ["INTERVIEWER"],
    avatar: null,
}
const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || undefined })
try {
    for (const viewport of [
        { width: 1440, height: 1000 },
        { width: 390, height: 844 },
    ]) {
        const context = await browser.newContext({ viewport })
        await context.addInitScript(() => localStorage.setItem("locale", JSON.stringify("en")))
        const page = await context.newPage()
        const errors = []
        const requests = []
        const writes = []
        const waitForRequest = async (predicate) => {
            const deadline = Date.now() + 10000
            while (!predicate(requests.at(-1) || {})) {
                assert.ok(Date.now() < deadline, `Timed out waiting for request: ${JSON.stringify(requests.at(-1))}`)
                await new Promise((resolve) => setTimeout(resolve, 50))
            }
            await page.waitForLoadState("networkidle")
        }
        page.on("pageerror", (error) => errors.push(error.message))
        const applications = Array.from({ length: 66 }, (_, index) => ({
            id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
            name: `Candidate ${index}`,
            email: `candidate${index}@example.com`,
            created: "2026-09-01T12:00:00Z",
            status: index === 64 ? "DONE" : "CREATED",
            type: "NEW",
            assignee: index === 65 ? null : index % 2 ? "interviewer" : "employee",
            notes: [],
        }))
        await page.route(`${baseURL}/api/**`, async (route) => {
            const request = route.request()
            const url = new URL(request.url())
            const path = url.pathname.replace(/^\/api/, "")
            const data = request.postDataJSON()
            let response = []
            if (path === "/user/account") response = employee
            else if (path === "/application/assignees") response = [employee, other]
            else if (path === "/user/resolve")
                response = [employee, other].filter((user) => data.includes(user.username))
            else if (path === "/applications") {
                const pageNumber = Number(url.searchParams.get("pageNumber"))
                const pageSize = Number(url.searchParams.get("pageSize"))
                const search = url.searchParams.get("searchQuery") || ""
                requests.push({ ...data, pageNumber, pageSize, search })
                const filtered = applications.filter(
                    (item) =>
                        (!data.assignee || item.assignee === data.assignee) &&
                        (!data.unassigned || item.assignee === null) &&
                        (data.showCompleted || item.status !== "DONE") &&
                        (!search || item.name.toLowerCase().includes(search.toLowerCase()))
                )
                response = {
                    content: filtered.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize),
                    page: {
                        pageNumber,
                        pageSize,
                        totalElements: filtered.length,
                        totalPages: Math.ceil(filtered.length / pageSize),
                    },
                }
            } else if (request.method() !== "GET") writes.push({ path, data })
            await route.fulfill({ json: response })
        })
        await page.goto(`${baseURL}/login`)
        await page.waitForURL(`${baseURL}/`)
        await page.goto(`${baseURL}/applications?assignee=employee&page=2`, { waitUntil: "domcontentloaded" })
        const select = page.getByRole("textbox", { name: "Assignee", exact: true })
        await page.waitForLoadState("networkidle")
        assert.equal(await select.inputValue(), "Elena Petrova")
        assert.equal(requests.at(-1).assignee, "employee")
        assert.equal(requests.at(-1).pageNumber, 1, "Deep link preserves pagination")
        await select.click()
        await select.fill("Ivan")
        await page.getByRole("option", { name: "Ivan Ivanov" }).click()
        await page.waitForURL(/assignee=interviewer/)
        await page.waitForLoadState("networkidle")
        await waitForRequest((request) => request.assignee === "interviewer")
        assert.equal(requests.at(-1).assignee, "interviewer")
        assert.equal(requests.at(-1).pageNumber, 0, "Changing assignee resets pagination")
        assert.equal(new URL(page.url()).searchParams.get("assignee"), "interviewer")
        assert.equal(await page.getByLabel("Assignee: Elena Petrova", { exact: true }).count(), 0)
        await page.goBack()
        await waitForRequest((request) => request.assignee === "employee")
        assert.equal(await select.inputValue(), "Elena Petrova")
        assert.equal(new URL(page.url()).searchParams.get("page"), "2")
        await page.goForward()
        await waitForRequest((request) => request.assignee === "interviewer")
        assert.equal(await select.inputValue(), "Ivan Ivanov")
        await page.getByText("Show completed", { exact: true }).click()
        await waitForRequest((request) => request.showCompleted === true)
        assert.equal(requests.at(-1).showCompleted, true)
        assert.equal(requests.at(-1).assignee, "interviewer")
        const search = page.getByPlaceholder("Search", { exact: false }).first()
        await search.fill("Candidate 1")
        await page.waitForURL(/search=Candidate/)
        await waitForRequest((request) => request.search === "Candidate 1")
        assert.equal(requests.at(-1).search, "Candidate 1")
        assert.equal(requests.at(-1).assignee, "interviewer")
        assert.equal(requests.at(-1).showCompleted, true)
        await page.reload()
        await page.waitForLoadState("networkidle")
        assert.equal(await select.inputValue(), "Ivan Ivanov")
        assert.equal(await search.inputValue(), "Candidate 1")
        await page.screenshot({ path: `${output}/filter-${viewport.width}.png`, fullPage: true })
        assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
            "No horizontal overflow"
        )
        await page.getByRole("button", { name: "Clear assignee filter", exact: true }).click()
        await waitForRequest((request) => !request.assignee)
        assert.equal(requests.at(-1).assignee, undefined)
        assert.equal(requests.at(-1).showCompleted, true)
        assert.equal(requests.at(-1).search, "Candidate 1")
        await page.getByRole("button", { name: "Reset filters", exact: false }).click()
        await waitForRequest((request) => !request.search && !request.showCompleted)
        assert.equal(new URL(page.url()).search, "")
        assert.equal(await search.inputValue(), "")
        assert.equal(await select.inputValue(), "")
        assert.equal(requests.at(-1).showCompleted, false)
        await select.click()
        await page.getByRole("option", { name: "Unassigned", exact: true }).click()
        await waitForRequest((request) => request.unassigned === true)
        assert.equal(requests.at(-1).assignee, undefined)
        assert.equal(new URL(page.url()).searchParams.get("unassigned"), "true")
        await page.getByText("Candidate 65", { exact: true }).waitFor()
        assert.equal(await page.getByLabel("Assignee: Elena Petrova", { exact: true }).count(), 0)
        await page.reload()
        await page.waitForLoadState("networkidle")
        assert.equal(await select.inputValue(), "Unassigned")
        await select.click()
        await page.getByRole("option", { name: "Ivan Ivanov" }).click()
        await waitForRequest((request) => request.assignee === "interviewer" && !request.unassigned)
        assert.equal(new URL(page.url()).searchParams.has("unassigned"), false)
        await page.getByRole("button", { name: "Reset filters", exact: false }).click()
        await waitForRequest((request) => !request.assignee && !request.unassigned)
        if (viewport.width === 1440) {
            await page.goto(`${baseURL}/applications?assignee=employee&page=2`, { waitUntil: "domcontentloaded" })
            await waitForRequest((request) => request.assignee === "employee" && request.pageNumber === 1)
            await page.setViewportSize({ width: 390, height: 844 })
            await waitForRequest((request) => request.pageNumber === 0 && request.pageSize === 10)
            assert.equal(new URL(page.url()).searchParams.get("assignee"), "employee")
            assert.equal(new URL(page.url()).searchParams.has("page"), false)
        }
        assert.deepEqual(writes, [], "Filtering must never mutate applications")
        assert.deepEqual(errors, [])
        console.log(
            `PASS ${viewport.width}px: assignee search, API filter, pagination, combined filters, reload, history, clearing, reset, no writes`
        )
        await context.close()
    }
} finally {
    await browser.close()
}
