// Captures real responsive layouts with synthetic API responses; never contacts a live backend.
import { chromium } from "playwright"
import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import { detail, routeData } from "./visual-fixtures.mjs"
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3017"
const output = process.env.TEST_OUTPUT_DIR || "/tmp/portal-visual-audit/current"
const widths = (process.env.AUDIT_WIDTHS || "1440,390").split(",").map(Number)
const schemes = (process.env.AUDIT_SCHEMES || "light").split(",")
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" })
const audit = []
try {
    for (const width of widths)
        for (const scheme of schemes) {
            const context = await browser.newContext({
                viewport: { width, height: Number(process.env.AUDIT_HEIGHT) || (width < 600 ? 844 : 1000) },
                colorScheme: scheme,
                reducedMotion: "reduce",
            })
            await context.addInitScript(() => localStorage.setItem("locale", JSON.stringify("ru")))
            const page = await context.newPage()
            const errors = []
            page.on("pageerror", (e) => errors.push({ url: page.url(), message: e.message }))
            await page.route(base + "/api/**", async (route) => {
                const req = route.request(),
                    path = new URL(req.url()).pathname.replace(/^\/api/, "")
                let data = null
                try {
                    data = req.postDataJSON()
                } catch {}
                await route.fulfill({ json: routeData(path, data) })
            })
            const capture = async (name, scroll = true) => {
                await page.waitForLoadState("networkidle")
                await page.evaluate(() => document.fonts.ready)
                await page.mouse.move(0, 0)
                await page.waitForTimeout(250)
                const metrics = await page.evaluate(() => {
                    const header = document.querySelector('[class*="rootGroup_"]')
                    const headerBounds = header?.getBoundingClientRect()
                    const headerOverflow = headerBounds
                        ? [...header.querySelectorAll("button,a")].some((e) => {
                              const r = e.getBoundingClientRect()
                              return r.right > innerWidth + 1 || r.bottom > headerBounds.bottom + 1
                          })
                        : false
                    const main = document.querySelector("main"),
                        vp = main?.querySelector(".mantine-ScrollArea-viewport")
                    const entries = [...document.querySelectorAll("button,input,textarea,select")]
                        .filter((e) => {
                            const r = e.getBoundingClientRect()
                            return r.width > 0 && r.height > 0 && r.top >= 70 && r.top < innerHeight - 34
                        })
                        .filter(
                            (e) =>
                                e.getBoundingClientRect().right > innerWidth + 1 || e.getBoundingClientRect().left < -1
                        )
                        .map((e) => ({
                            tag: e.tagName,
                            text: (e.textContent || e.getAttribute("aria-label") || e.getAttribute("name") || "").slice(
                                0,
                                80
                            ),
                        }))
                    return {
                        headerOverflow,
                        documentOverflow: document.documentElement.scrollWidth - innerWidth,
                        mainOverflow: vp ? vp.scrollWidth - vp.clientWidth : 0,
                        scrollHeight: vp?.scrollHeight || 0,
                        height: vp?.clientHeight || 0,
                        clippedControls: entries,
                    }
                })
                const stem = `${name}-${width}-${scheme}`
                await page.screenshot({ path: `${output}/${stem}-top.png` })
                if (scroll && metrics.scrollHeight > metrics.height + 80) {
                    const fractions = process.env.AUDIT_FULL_SCROLL
                        ? Array.from(
                              { length: Math.ceil((metrics.scrollHeight - metrics.height) / (metrics.height * 0.85)) },
                              (_, i) =>
                                  Math.min(
                                      1,
                                      ((i + 1) * metrics.height * 0.85) / (metrics.scrollHeight - metrics.height)
                                  )
                          )
                        : [0.5, 1]
                    for (const fraction of fractions) {
                        await page.evaluate((f) => {
                            const vp = document.querySelector("main .mantine-ScrollArea-viewport")
                            if (vp) vp.scrollTop = (vp.scrollHeight - vp.clientHeight) * f
                        }, fraction)
                        await page.waitForTimeout(150)
                        await page.screenshot({
                            path: `${output}/${stem}-${fraction === 1 ? "bottom" : process.env.AUDIT_FULL_SCROLL ? `slice-${Math.round(fraction * 100)}` : "middle"}.png`,
                        })
                    }
                }
                audit.push({ name, width, scheme, ...metrics })
            }
            await page.goto(base + "/login")
            await page.waitForURL(base + "/")
            const pages = [
                ["my-reports", "/reports/personal"],
                ["create-report", "/report/create"],
                ["edit-report", `/report/${detail.id}/edit`],
                ["report", `/report/${detail.id}`],
                ["reports", "/reports"],
                ["volunteers", "/volunteers"],
                ["profile", "/profile/elena"],
                ["applications", "/applications"],
                ["application", "/application/application-0"],
                ["activity", "/volunteers/heatmap"],
                ["statistics", "/volunteers/reports"],
                ["announcements", "/announcements/admin"],
                ["support", "/support"],
                ["guide", "/reporting-guide"],
                ["cleaning", "/cleaning-how-to"],
                ["terms", "/application"],
                ["application-form", "/application/form"],
                ["application-status", "/application-status/example"],
            ]
            for (const [name, path] of pages.filter(
                ([name]) => !process.env.AUDIT_PAGES || process.env.AUDIT_PAGES.split(",").includes(name)
            )) {
                await page.goto(base + path)
                await capture(name)
            }
            // Shared overlays, inspected without submitting anything.
            const overlay = async (name, path, action) => {
                await page.goto(base + path)
                await page.waitForLoadState("networkidle")
                await action()
                await page.getByRole("dialog").waitFor()
                await capture(name, false)
                const dialog = page.getByRole("dialog")
                const canScroll = await dialog.evaluate((e) => e.scrollHeight > e.clientHeight + 80)
                if (canScroll) {
                    for (const fraction of [0.5, 1]) {
                        await dialog.evaluate((e, f) => {
                            e.scrollTop = (e.scrollHeight - e.clientHeight) * f
                        }, fraction)
                        await page.waitForTimeout(150)
                        await page.screenshot({
                            path: `${output}/${name}-${width}-${scheme}-dialog-${fraction === 1 ? "bottom" : "middle"}.png`,
                        })
                    }
                }
                await page.keyboard.press("Escape")
            }
            if (process.env.AUDIT_OVERLAYS !== "0") {
                await overlay("export", "/reports/personal", () =>
                    page.getByRole("button", { name: "Экспорт", exact: true }).click()
                )
                await overlay("profile-edit", "/profile/elena", () =>
                    page.getByRole("button", { name: "Редактировать", exact: false }).first().click()
                )
                await overlay("contract-edit", "/profile/elena", () =>
                    page.getByRole("button", { name: "Редактировать", exact: false }).nth(1).click()
                )
                await overlay("application-edit", "/application/application-0", () =>
                    page.getByRole("button", { name: "Редактировать", exact: false }).click()
                )
                if (width <= 1024)
                    await overlay("navigation", "/reports/personal", () =>
                        page.getByRole("button", { name: "Навигация", exact: true }).click()
                    )
                await overlay("notifications", "/reports/personal", () =>
                    page.getByRole("button", { name: "notifications", exact: true }).click()
                )
                await overlay("create-user", "/applications", () =>
                    page.getByRole("button", { name: "Добавить пользователя", exact: true }).click()
                )
                await overlay("residence-permit", "/profile/elena", () =>
                    page.getByRole("button", { name: "Добавить ВНЖ", exact: false }).click()
                )
                if (width < 1024)
                    for (const path of ["/reports", "/volunteers"]) {
                        await page.goto(base + path)
                        await page.waitForLoadState("networkidle")
                        await page.getByRole("button", { name: /^Фильтры/ }).click()
                        await capture(path === "/reports" ? "report-filters" : "volunteer-filters")
                    }
            }
            audit.push({ width, scheme, errors })
            await context.close()
            console.log(
                `Captured ${width}px ${scheme}: pages and overlays selected for this run; errors=${errors.length}`
            )
        }
    const failures = audit.filter(
        (x) =>
            x.headerOverflow ||
            x.documentOverflow > 1 ||
            x.mainOverflow > 1 ||
            x.clippedControls?.length ||
            x.errors?.length
    )
    assert.deepEqual(failures, [], "Visual bounds or browser errors; inspect metrics.json and screenshots")
} finally {
    await writeFile(`${output}/metrics.json`, JSON.stringify(audit, null, 2))
    await browser.close()
}
