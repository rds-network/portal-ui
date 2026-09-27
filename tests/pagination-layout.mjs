// Uses synthetic long lists to check pagination alignment while scrolling.
import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"
import { routeData } from "./visual-fixtures.mjs"

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3017"
const output = process.env.TEST_OUTPUT_DIR || "/tmp/portal-pagination-layout"
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" })
try {
    for (const width of [1440, 1040, 390, 320]) {
        const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: "reduce" })
        await context.addInitScript(() => localStorage.setItem("locale", JSON.stringify("ru")))
        const page = await context.newPage()
        await page.route(base + "/api/**", async (route) => {
            const path = new URL(route.request().url()).pathname.replace(/^\/api/, "")
            let payload
            try {
                payload = route.request().postDataJSON()
            } catch {}
            const data = routeData(path, payload)
            if (["/reports", "/user/search", "/applications"].includes(path)) {
                data.content = Array.from({ length: 24 }, (_, i) => ({
                    ...data.content[i % data.content.length],
                    id: `list-${i}`,
                }))
                data.page = { ...data.page, totalPages: 6, totalElements: 126 }
            }
            await route.fulfill({ json: data })
        })
        await page.goto(base + "/login")
        await page.waitForURL(base + "/")
        for (const name of ["reports", "volunteers", "applications"]) {
            await page.goto(base + "/" + name)
            await page.waitForLoadState("networkidle")
            const viewport = page.locator("main .mantine-ScrollArea-viewport")
            const pagination = page.locator(".mantine-Pagination-root").locator("..")
            const content = page.locator("main table, main [class*=mobileList_]").first()
            for (const fraction of [0, 0.5, 1]) {
                await viewport.evaluate((e, f) => {
                    e.scrollTop = (e.scrollHeight - e.clientHeight) * f
                }, fraction)
                await page.waitForTimeout(100)
                const panel = await pagination.boundingBox()
                const list = await content.boundingBox()
                const scroll = await viewport.boundingBox()
                assert.ok(Math.abs(panel.x - list.x) <= 1, `${name} ${width}px: left edge alignment`)
                assert.ok(
                    Math.abs(panel.x + panel.width - list.x - list.width) <= 1,
                    `${name} ${width}px: right edge alignment`
                )
                assert.ok(
                    panel.x + panel.width <= scroll.x + scroll.width - 12,
                    `${name}: pagination must leave room for scrollbar`
                )
                assert.ok(
                    panel.y + panel.height <= scroll.y + scroll.height + 1,
                    `${name}: sticky panel must stay visible`
                )
                assert.equal(await viewport.evaluate((e) => e.scrollWidth - e.clientWidth), 0)
                await page.screenshot({ path: `${output}/${name}-${width}-${fraction}.png` })
            }
            const second = pagination.getByRole("button", { name: "2", exact: true })
            await second.click()
            await page.waitForFunction(() =>
                [...document.querySelectorAll(".mantine-Pagination-control[data-active]")].some(
                    (e) => e.textContent === "2"
                )
            )
            await page.waitForLoadState("networkidle")
            assert.ok(await second.evaluate((e) => e.hasAttribute("data-active")), "Pagination still switches pages")
            console.log(`PASS ${name} ${width}px: matching edges, clear scrollbar, sticky scrolling and page switching`)
        }
        await context.close()
    }
} finally {
    await browser.close()
}
