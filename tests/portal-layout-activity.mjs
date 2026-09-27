// Browser regression checks with synthetic API responses; no live backend is used.
import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"
import { heatmap, routeData } from "./visual-fixtures.mjs"

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3017"
const output = process.env.TEST_OUTPUT_DIR || "/tmp/portal-layout-activity"
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" })

async function session(width, colorScheme = "light", intercept) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme,
        timezoneId: "Europe/Belgrade",
        reducedMotion: "reduce",
    })
    await context.addInitScript(() => localStorage.setItem("locale", JSON.stringify("ru")))
    const page = await context.newPage()
    await page.route(base + "/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname.replace(/^\/api/, "")
        if (await intercept?.(path, route)) return
        let data = null
        try {
            data = route.request().postDataJSON()
        } catch {}
        await route.fulfill({ json: routeData(path, data) })
    })
    await page.goto(base + "/login")
    await page.waitForURL(base + "/")
    await page.waitForLoadState("networkidle")
    return { context, page }
}

try {
    const dates = [
        ["2026-06-30T23:59:59+02:00", ["2025", "2026"]],
        ["2026-07-01T00:00:00+02:00", ["2026"]],
        ["2026-12-31T23:59:59+01:00", ["2026"]],
        ["2027-01-01T00:00:00+01:00", ["2026", "2027"]],
    ]
    for (const width of [1440, 390]) {
        for (const [date, expected] of dates) {
            const year = Number(date.slice(0, 4))
            const { context, page } = await session(width, "light", async (path, route) => {
                if (path !== "/reports/heat-map/currentUser") return false
                await route.fulfill({ json: { [year - 1]: heatmap[2026], [year]: heatmap[2026] } })
                return true
            })
            await page.clock.setFixedTime(new Date(date))
            await page.goto(base + "/reports/personal")
            await page.waitForLoadState("networkidle")
            const activity = page.getByRole("heading", { name: "Ваша активность" }).locator("../..")
            const shown = await activity.locator('[class*="year_"] > div:first-child > p:first-child').allTextContents()
            assert.deepEqual(shown, expected, `${date}, ${width}px: visible activity years`)
            await context.close()
        }
    }
    console.log("Activity year boundaries passed on desktop and mobile.")

    for (const width of [1440, 1040, 768, 390, 360, 320]) {
        let release
        const pending = new Promise((resolve) => {
            release = resolve
        })
        const { context, page } = await session(width, "light", async (path, route) => {
            if (path !== "/user/search") return false
            await pending
            await route.fulfill({ json: routeData(path) })
            return true
        })
        await page.goto(base + "/volunteers")
        const loader = page.getByRole("status", { name: "Загрузка…", exact: true })
        await loader.waitFor({ state: "visible" })
        const heading = page.getByRole("heading", { name: "Все волонтеры" })
        const before = await heading.boundingBox()
        const layout = await loader.evaluate((element) => {
            const box = element.getBoundingClientRect()
            const actions = document.querySelector('[class*="actions_"]').getBoundingClientRect()
            return {
                right: box.right,
                actionsLeft: actions.left,
                bottom: box.bottom,
                position: getComputedStyle(element).position,
            }
        })
        assert.equal(layout.position, "absolute")
        assert.ok(layout.right <= layout.actionsLeft, `Loader overlaps header actions at ${width}px`)
        assert.ok(layout.bottom < before.y, "Loader must stay inside the header")
        await page.screenshot({ path: `${output}/loading-${width}.png` })
        release()
        await loader.waitFor({ state: "hidden" })
        const after = await heading.boundingBox()
        assert.equal(after.y, before.y, "Finishing a request must not shift page content")
        const toggle = page.getByRole("button", { name: "Навигация", exact: true })
        if (width > 1024) {
            assert.equal(await toggle.count(), 0, "Desktop navigation has no toggle")
            await page.locator("#portal-navigation").waitFor({ state: "visible" })
            await page.keyboard.press("Escape")
            assert.ok(await page.locator("#portal-navigation").isVisible(), "Desktop navigation stays open")
        } else {
            const toggleBox = await toggle.boundingBox()
            const logoBox = await page.getByRole("img", { name: "RDS", exact: true }).boundingBox()
            assert.ok(toggleBox.x + toggleBox.width <= logoBox.x, "Mobile menu button goes before the logo")
            assert.ok(toggleBox.y + toggleBox.height <= 72, "Mobile menu button stays inside the header")
            await toggle.click()
            const drawer = page.getByRole("dialog")
            await drawer.waitFor({ state: "visible" })
            await drawer.getByRole("link", { name: "Мои отчеты", exact: true }).click()
            await drawer.waitFor({ state: "hidden" })
            assert.equal(await toggle.getAttribute("aria-expanded"), "false", "Navigation closes the mobile drawer")
        }
        if (width === 1440) {
            await page.goto(base + "/cleaning-how-to")
            await page.waitForLoadState("networkidle")
            const alignment = await page.evaluate(() => {
                const menu = document.querySelector(".mantine-AppShell-navbar").getBoundingClientRect()
                const content = document.querySelector("main h1").closest(".mantine-Flex-root").getBoundingClientRect()
                return { menu: menu.top, content: content.top }
            })
            assert.ok(Math.abs(alignment.menu - alignment.content) <= 1, JSON.stringify(alignment))
            assert.equal(alignment.menu, 92)
        }
        if ([1440, 390].includes(width)) {
            await page.goto(base + "/report/create")
            await page.waitForLoadState("networkidle")
            assert.equal(await page.getByText("Расскажите, что удалось сделать.", { exact: true }).count(), 0)
            assert.equal(
                await page
                    .locator("aside")
                    .getByRole("button", { name: /Задача \d/ })
                    .count(),
                0
            )
            await page.locator("aside").scrollIntoViewIfNeeded()
            if (width < 1024) {
                await page.locator("main .mantine-ScrollArea-viewport").evaluate((e) => {
                    e.scrollTop = e.scrollHeight
                })
            }
            await page.screenshot({ path: `${output}/report-summary-${width}.png` })
        }
        await context.close()
    }
    console.log("Loading indicator, compact alignment and report summary passed.")

    for (const colorScheme of ["light", "dark"]) {
        for (const width of [390, 320]) {
            const { context, page } = await session(width, colorScheme)
            await page.goto(base + "/reports/personal")
            await page.waitForLoadState("networkidle")
            await page.getByRole("button", { name: "Навигация", exact: true }).click()
            await page.getByRole("dialog").waitFor()
            const header = page.locator(".mantine-Drawer-header")
            assert.equal(await header.evaluate((e) => getComputedStyle(e).backgroundColor), "rgba(0, 0, 0, 0)")
            assert.equal(await header.evaluate((e) => getComputedStyle(e).color), "rgb(237, 245, 244)")
            await page.screenshot({ path: `${output}/navigation-${width}-${colorScheme}.png` })
            await page.keyboard.press("Escape")
            await page.getByRole("dialog").waitFor({ state: "hidden" })
            await page.getByRole("button", { name: "Навигация", exact: true }).waitFor({ state: "visible" })
            await context.close()
        }
    }
    console.log("Mobile navigation passed in both themes.")

    const { context, page } = await session(1440)
    await page.goto(base + "/reports/personal")
    await page.waitForLoadState("networkidle")
    const toggle = page.getByRole("button", { name: "Навигация", exact: true })
    await page.setViewportSize({ width: 390, height: 900 })
    await toggle.waitFor({ state: "visible" })
    await toggle.click()
    await page.getByRole("dialog").waitFor({ state: "visible" })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByRole("dialog").waitFor({ state: "hidden" })
    await page.locator(".mantine-AppShell-navbar #portal-navigation").waitFor({ state: "visible" })
    assert.equal(await toggle.count(), 0)
    await page.setViewportSize({ width: 390, height: 900 })
    await toggle.waitFor({ state: "visible" })
    assert.equal(await toggle.getAttribute("aria-expanded"), "false")
    await context.close()
    console.log("Desktop/mobile resize keeps desktop navigation open and resets the mobile drawer.")
} finally {
    await browser.close()
}
