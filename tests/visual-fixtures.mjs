// Deterministic, synthetic portal data for visual review.
export const avatar =
    "data:image/svg+xml," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="24" fill="#b7d8d0"/><text x="40" y="52" text-anchor="middle" font-size="32" fill="#285855">ЕП</text></svg>'
    )
export const baseUser = {
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
export const task = {
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
export const reports = Array.from({ length: 8 }, (_, i) => ({
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
export const heatmap = {
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

export const user = {
    ...baseUser,
    enabled: true,
    active: true,
    isActive: true,
    contracts: [{ id: "contract", startDate: "2026-01-01", endDate: "2027-01-01", type: "REGULAR" }],
    residencePermits: [
        {
            id: "permit",
            nationality: "Russia",
            registrationNumber: "123456789",
            validUntil: "2027-06-01",
            purposeOfStay: "Volunteering",
            issuingAuthority: "MUP Beograd",
            stateOfBirth: "Russia",
            issuingDate: "2026-06-01",
            note: "Продление по действующему договору",
        },
    ],
}
const users = [
    user,
    {
        ...user,
        id: 2,
        username: "alexander",
        fullName: "Александр Константинопольский",
        email: "alexander.konstantinopolsky@example.com",
        avatar: null,
    },
    {
        ...user,
        id: 3,
        username: "maria",
        fullName: "Мария Смирнова",
        email: "maria@example.com",
        groups: ["VOLUNTEER"],
        avatar: null,
    },
]
const pageOf = (content) => ({ content, page: { pageNumber: 0, pageSize: 10, totalPages: 3, totalElements: 24 } })
const apps = users.map((u, i) => ({
    id: `application-${i}`,
    name: u.fullName,
    email: u.email,
    phone: u.phone,
    telegram: u.telegram,
    created: "2026-09-01T14:30:00",
    status: ["CREATED", "PAUSED", "DONE"][i],
    type: "NEW",
    birthDate: u.birthDate,
    gender: "FEMALE",
    inSerbia: true,
    city: u.city,
    address: u.address,
    postalCode: u.postalCode,
    program: "IT",
    project: "PORTAL",
    occupation: "Разработка и поддержка портала",
    assignee: "elena",
    contract: user.contracts[0],
    notes: [
        {
            id: "note",
            text: "Документы получены. Согласовать удобное время для встречи и уточнить участие в программе.",
            createdBy: "elena",
            created: "2026-09-01T16:00:00",
            createTime: "2026-09-01T16:00:00",
        },
    ],
}))
export const detail = {
    ...reports[2],
    tasks: [
        {
            ...task,
            name: "Подготовка материалов и проведение встречи волонтёрской команды",
            files: [
                {
                    id: "evidence",
                    name: "Итоги встречи волонтёрской команды.pdf",
                    link: "https://example.com/report.pdf",
                },
            ],
        },
        { ...task, id: "task2", name: "Обновление инструкций по заполнению отчётности" },
    ],
    notes: [
        {
            id: "note",
            text: "Пожалуйста, добавьте ссылку на результат работы и уточните, какие материалы подготовлены.",
            createdBy: "elena",
            createTime: "2026-09-04T10:00:00",
        },
    ],
}
export const routeData = (path, data) => {
    if (path === "/user/account" || path.startsWith("/user/info/")) return user
    if (path === "/user/resolve") return users.filter((u) => data?.includes(u.username))
    if (path === "/user/search") return pageOf(users)
    if (path === "/programs")
        return [{ ...user.program, nameEn: "Technology", nameSr: "Tehnologija", projectCodes: ["PORTAL"] }]
    if (path === "/projects")
        return [{ ...user.project, nameEn: "Volunteer portal", nameSr: "Portal volontera", programCode: "IT" }]
    if (path === "/reports/heat-map/currentUser") return heatmap
    if (path === "/reports/heat-map") return pageOf(users.map((u) => ({ ...heatmap[2026], volunteerInfo: u })))
    if (path === "/reports") return pageOf(reports.map((r, i) => ({ ...r, user: users[i % 3].username })).slice(0, 5))
    if (path.startsWith("/report/")) return detail
    if (path === "/application/assignees") return users.slice(0, 2)
    if (path === "/applications") return pageOf(apps)
    if (path.startsWith("/application/status/"))
        return { id: "example", status: "CREATED", progress: 25, lastUpdate: "2026-09-01" }
    if (path.startsWith("/application/")) return apps[0]
    if (path === "/announcements/unread-count") return { count: 2 }
    if (path === "/announcements")
        return [
            {
                id: "announcement",
                title: "Встреча волонтёров в сентябре",
                body: "<p>Обсудим планы команды и ответим на вопросы по отчётности.</p>",
                createTime: "2026-09-01T10:30:00",
                read: false,
            },
        ]
    if (path === "/ticket/groups") return ["Поддержка", "Волонтёры"]
    if (path === "/cities" || path === "/cities/search")
        return [{ code: "BEOGRAD", name: "Belgrade", nameRu: "Белград", nameEn: "Belgrade", nameSr: "Beograd" }]
    if (path.startsWith("/statistics/"))
        return {
            programStatistics: {
                total: { count: 24, totalTimeSpent: 800 },
                items: [{ code: "OTHER", data: { count: 24, totalTimeSpent: 800 } }],
            },
            finalUsersStatistics: {
                totalCount: 100,
                maleCount: 40,
                femaleCount: 60,
                culturalAssetsCount: 12,
                naturalAssetsCount: 18,
                publicAreasCount: 56,
                otherCount: 14,
            },
            volunteerStatistics: {
                maleCount: 8,
                femaleCount: 16,
                age15to18Count: 2,
                age18to30Count: 6,
                age30to40Count: 9,
                age40to65Count: 6,
                age65AndAboveCount: 1,
                citizensCount: 4,
                foreignersCount: 20,
            },
        }
    return []
}
