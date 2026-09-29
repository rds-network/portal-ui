import {
    Avatar,
    Badge,
    Button,
    Flex,
    Modal,
    Select,
    TagsInput,
    Text,
    Textarea,
    TextInput,
    Title,
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { useDebouncedValue } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { IconBulb, IconHandStop, IconHistory, IconSearch, IconUsers, type Icon } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useContext, useEffect, useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useSearchParams } from "react-router"
import { usePrograms } from "src/app/providers/ProgramsProvider"
import { UserContext } from "src/app/providers/UserContext"
import {
    IdeasApiService,
    IdeasBadge,
    TalentPostDto,
    TalentPostType,
} from "src/shared/api/IdeasApiService"
import { resolveUsers } from "src/shared/api/user/UserApiService"
import { setDocumentTitleByLocale } from "src/shared/hooks/useDocumentTitle"
import { SuccessNotification } from "src/shared/notifications/SuccessNotification"
import { CitySelect } from "src/shared/ui/citySelect/CitySelect"
import classes from "./IdeasPage.module.scss"

const TABS: TalentPostType[] = ["NEED_PEOPLE", "CAN_HELP", "PROJECT_IDEA"]

const TAB_ICONS: Record<TalentPostType, Icon> = {
    NEED_PEOPLE: IconUsers,
    CAN_HELP: IconHandStop,
    PROJECT_IDEA: IconBulb,
}

const TYPE_BADGE: Record<TalentPostType, string> = {
    NEED_PEOPLE: "blue",
    CAN_HELP: "teal",
    PROJECT_IDEA: "grape",
}

const respondLabelId = (type: TalentPostType) =>
    type === "CAN_HELP" ? "pages.ideas.offerSelf" : "pages.ideas.respond"

export const IdeasPage: React.FC = () => {
    const { user } = useContext(UserContext)
    const intl = useIntl()
    const queryClient = useQueryClient()
    const programs = usePrograms()
    const [searchParams, setSearchParams] = useSearchParams()

    const initialType = (searchParams.get("type") as TalentPostType | null) || "NEED_PEOPLE"
    const [tab, setTab] = useState<TalentPostType>(
        TABS.includes(initialType) ? initialType : "NEED_PEOPLE"
    )
    const [showMine, setShowMine] = useState(searchParams.get("mine") === "1")
    const [q, setQ] = useState(searchParams.get("q") || "")
    const [city, setCity] = useState(searchParams.get("city") || "")
    const [programCode, setProgramCode] = useState<string | null>(searchParams.get("programCode"))
    const [debouncedQ] = useDebouncedValue(q, 300)

    const [createOpen, setCreateOpen] = useState(false)
    const [respondPost, setRespondPost] = useState<TalentPostDto | null>(null)
    const [respondMessage, setRespondMessage] = useState("")
    const [closeTarget, setCloseTarget] = useState<TalentPostDto | null>(null)
    const [responsesPost, setResponsesPost] = useState<TalentPostDto | null>(null)
    const [skillsDraft, setSkillsDraft] = useState<string[]>([])
    const [skillsDirty, setSkillsDirty] = useState(false)

    setDocumentTitleByLocale("pages.ideas.title")

    useEffect(() => {
        IdeasBadge.markSeen()
        queryClient.invalidateQueries({ queryKey: ["ideas-unread"] })
    }, [queryClient])

    const createForm = useForm({
        initialValues: {
            title: "",
            body: "",
            city: "",
            programCode: null as string | null,
            skills: [] as string[],
        },
        validate: {
            title: (v) => (!v.trim() ? intl.formatMessage({ id: "pages.ideas.requiredTitle" }) : null),
            body: (v) => (!v.trim() ? intl.formatMessage({ id: "pages.ideas.requiredBody" }) : null),
        },
    })

    useEffect(() => {
        const next = new URLSearchParams()
        if (showMine) {
            next.set("mine", "1")
        } else {
            next.set("type", tab)
            if (debouncedQ.trim()) next.set("q", debouncedQ.trim())
            if (city.trim()) next.set("city", city.trim())
            if (programCode) next.set("programCode", programCode)
        }
        const post = searchParams.get("post")
        if (post) next.set("post", post)
        setSearchParams(next, { replace: true })
    }, [tab, debouncedQ, city, programCode, showMine]) // eslint-disable-line react-hooks/exhaustive-deps

    const { data: postsPage, isLoading: boardLoading, isError: boardError } = useQuery({
        queryKey: ["talent-posts", tab, debouncedQ, city, programCode],
        queryFn: () =>
            IdeasApiService.listPosts({
                type: tab,
                q: debouncedQ.trim() || undefined,
                city: city.trim() || undefined,
                programCode: programCode || undefined,
                page: 0,
                size: 40,
            }),
        enabled: !!user && !showMine,
    })

    const { data: myPostsPage, isLoading: mineLoading, isError: mineError } = useQuery({
        queryKey: ["talent-my-posts"],
        queryFn: () => IdeasApiService.listMyPosts({ page: 0, size: 50 }),
        enabled: !!user && showMine,
    })

    const isLoading = showMine ? mineLoading : boardLoading
    const postsError = showMine ? mineError : boardError
    const posts = (showMine ? myPostsPage?.content : postsPage?.content) ?? []

    const { data: ideaPosts } = useQuery({
        queryKey: ["talent-posts", "featured-idea"],
        queryFn: () => IdeasApiService.listPosts({ type: "PROJECT_IDEA", page: 0, size: 1 }),
        enabled: !!user && !showMine,
        staleTime: 60_000,
    })
    const featured = ideaPosts?.content?.[0] ?? null

    const { data: responseList = [], isLoading: responsesLoading } = useQuery({
        queryKey: ["talent-responses", responsesPost?.id],
        queryFn: () => IdeasApiService.listResponses(responsesPost!.id),
        enabled: !!responsesPost,
    })

    const { data: mySkills = [] } = useQuery({
        queryKey: ["talent-skills", "me"],
        queryFn: () => IdeasApiService.getMySkills(),
        enabled: !!user,
    })

    useEffect(() => {
        if (!skillsDirty) setSkillsDraft(mySkills)
    }, [mySkills, skillsDirty])

    useEffect(() => {
        const postId = searchParams.get("post")
        if (!postId || posts.length === 0) return
        const el = document.getElementById(`post-${postId}`)
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
    }, [posts, searchParams])

    const avatarLogins = useMemo(() => {
        const set = new Set<string>()
        posts.forEach((p) => {
            set.add(p.authorUsername)
            ;(p.responderUsernames || []).forEach((u) => set.add(u))
        })
        if (featured) set.add(featured.authorUsername)
        responseList.forEach((r) => set.add(r.authorUsername))
        return [...set]
    }, [posts, featured, responseList])

    const { data: users = {} } = resolveUsers(avatarLogins)

    const programOptions = useMemo(
        () =>
            programs.map((p) => ({
                value: p.code || "",
                label: p.nameRu || p.code || "",
            })).filter((p) => p.value),
        [programs]
    )

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["talent-posts"] })
        queryClient.invalidateQueries({ queryKey: ["talent-my-posts"] })
        queryClient.invalidateQueries({ queryKey: ["talent-skills"] })
        queryClient.invalidateQueries({ queryKey: ["ideas-unread"] })
    }

    const { mutate: createPost, isPending: creating } = useMutation({
        mutationFn: () =>
            IdeasApiService.createPost({
                type: tab,
                title: createForm.values.title.trim(),
                body: createForm.values.body.trim(),
                city: createForm.values.city.trim() || null,
                programCode: createForm.values.programCode,
                skills: createForm.values.skills,
            }),
        onSuccess: (created) => {
            createForm.reset()
            setCreateOpen(false)
            setQ("")
            setCity("")
            setProgramCode(null)
            setShowMine(false)
            setTab(created.type)
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.ideas.created" />
                    </Text>,
                    null
                )
            )
        },
        onError: () => {
            notifications.show({
                color: "red",
                message: intl.formatMessage({ id: "pages.ideas.createError" }),
            })
        },
    })

    const { mutate: sendResponse, isPending: responding } = useMutation({
        mutationFn: () =>
            IdeasApiService.createResponse(respondPost!.id, {
                message: respondMessage.trim(),
            }),
        onSuccess: () => {
            setRespondPost(null)
            setRespondMessage("")
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.ideas.responded" />
                    </Text>,
                    null
                )
            )
        },
        onError: () => {
            notifications.show({
                color: "red",
                message: intl.formatMessage({ id: "pages.ideas.respondError" }),
            })
        },
    })

    const { mutate: saveSkills, isPending: savingSkills } = useMutation({
        mutationFn: () => IdeasApiService.putMySkills(skillsDraft),
        onSuccess: (skills) => {
            setSkillsDraft(skills)
            setSkillsDirty(false)
            queryClient.setQueryData(["talent-skills", "me"], skills)
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.ideas.skillsSaved" />
                    </Text>,
                    null
                )
            )
        },
        onError: () => {
            notifications.show({
                color: "red",
                message: intl.formatMessage({ id: "pages.ideas.skillsError" }),
            })
        },
    })

    const { mutate: closePost, isPending: closing } = useMutation({
        mutationFn: (id: string) => IdeasApiService.closePost(id),
        onSuccess: () => {
            setCloseTarget(null)
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.ideas.closed" />
                    </Text>,
                    null
                )
            )
            setShowMine(true)
        },
        onError: () => {
            notifications.show({
                color: "red",
                message: intl.formatMessage({ id: "pages.ideas.closeError" }),
            })
        },
    })

    const { mutate: reopenPost, isPending: reopening } = useMutation({
        mutationFn: (id: string) => IdeasApiService.reopenPost(id),
        onSuccess: () => {
            invalidate()
            notifications.show(
                SuccessNotification(
                    <Text size="sm">
                        <FormattedMessage id="pages.ideas.reopened" />
                    </Text>,
                    null
                )
            )
        },
        onError: () => {
            notifications.show({
                color: "red",
                message: intl.formatMessage({ id: "pages.ideas.reopenError" }),
            })
        },
    })

    const openCreate = () => {
        createForm.setValues({
            title: "",
            body: "",
            city: user?.city || "",
            programCode: user?.program?.code || null,
            skills: mySkills,
        })
        setCreateOpen(true)
    }

    const renderCard = (post: TalentPostDto) => {
        const author = users[post.authorUsername]
        const responders = (post.responderUsernames || []).slice(0, 5)
        return (
            <article key={post.id} className={classes.card} id={`post-${post.id}`}>
                <div className={classes.cardTop}>
                    <Flex gap={8} wrap="wrap" align="center">
                        <Badge color={TYPE_BADGE[post.type]} variant="light">
                            <FormattedMessage id={`pages.ideas.types.${post.type}`} />
                        </Badge>
                        <Badge color={post.status === "OPEN" ? "green" : "gray"} variant="outline">
                            <FormattedMessage id={`pages.ideas.status.${post.status}`} />
                        </Badge>
                    </Flex>
                    <Text size="xs" c="dimmed">
                        {author?.fullName || post.authorFullName || post.authorUsername}
                    </Text>
                </div>
                <h3 className={classes.cardTitle}>{post.title}</h3>
                <p className={classes.cardBody}>{post.body}</p>
                {post.skills?.length > 0 && (
                    <div className={classes.tags}>
                        {post.skills.map((skill) => (
                            <Badge key={skill} variant="dot" color="gray">
                                {skill}
                            </Badge>
                        ))}
                    </div>
                )}
                <div className={classes.meta}>
                    {post.city && <span>{post.city}</span>}
                    {(post.programNameRu || post.programCode) && (
                        <span>{post.programNameRu || post.programCode}</span>
                    )}
                </div>
                <div className={classes.cardFooter}>
                    <div className={classes.responders}>
                        <div className={classes.avatarStack}>
                            {responders.map((login) => (
                                <Avatar
                                    key={login}
                                    size={26}
                                    radius="xl"
                                    src={users[login]?.avatar?.link}
                                    name={users[login]?.fullName || login}
                                    color="initials"
                                />
                            ))}
                        </div>
                        <Text size="sm" c="dimmed">
                            <FormattedMessage
                                id="pages.ideas.responseCount"
                                values={{ count: post.responseCount }}
                            />
                        </Text>
                    </div>
                    <Flex gap={8} wrap="wrap">
                        {post.mine && post.responseCount > 0 && (
                            <Button
                                variant="subtle"
                                size="compact-sm"
                                onClick={() => setResponsesPost(post)}
                            >
                                <FormattedMessage id="pages.ideas.viewResponses" />
                            </Button>
                        )}
                        {post.mine && post.status === "OPEN" && (
                            <Button
                                variant="light"
                                color="gray"
                                size="compact-sm"
                                onClick={() => setCloseTarget(post)}
                            >
                                <FormattedMessage id="pages.ideas.close" />
                            </Button>
                        )}
                        {post.mine && post.status === "CLOSED" && (
                            <Button
                                variant="light"
                                color="teal"
                                size="compact-sm"
                                loading={reopening}
                                onClick={() => reopenPost(post.id)}
                            >
                                <FormattedMessage id="pages.ideas.reopen" />
                            </Button>
                        )}
                        {!post.mine && post.status === "OPEN" && (
                            <Button
                                size="compact-sm"
                                disabled={!!post.alreadyResponded}
                                onClick={() => {
                                    setRespondPost(post)
                                    setRespondMessage("")
                                }}
                            >
                                <FormattedMessage
                                    id={
                                        post.alreadyResponded
                                            ? "pages.ideas.alreadyResponded"
                                            : respondLabelId(post.type)
                                    }
                                />
                            </Button>
                        )}
                    </Flex>
                </div>
            </article>
        )
    }

    return (
        <div className={classes.root}>
            <div className={classes.header}>
                <div>
                    <Title order={1} className={classes.title}>
                        <Flex align="center" gap={10}>
                            <IconBulb size={30} stroke={1.6} />
                            <FormattedMessage id="pages.ideas.title" />
                        </Flex>
                    </Title>
                    <Text className={classes.subtitle}>
                        <FormattedMessage id="pages.ideas.description" />
                    </Text>
                </div>
                <Button onClick={openCreate}>
                    <FormattedMessage id="pages.ideas.publish" />
                </Button>
            </div>

            <div className={classes.layout}>
                <div className={classes.main}>
                    {featured && !showMine && tab !== "PROJECT_IDEA" && (
                        <div className={classes.featured}>
                            <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                                <FormattedMessage id="pages.ideas.featured" />
                            </Text>
                            <Text fw={650}>{featured.title}</Text>
                            <Text size="sm" lineClamp={2} c="dimmed">
                                {featured.body}
                            </Text>
                            <Button
                                variant="subtle"
                                size="compact-sm"
                                w="fit-content"
                                onClick={() => {
                                    setShowMine(false)
                                    setTab("PROJECT_IDEA")
                                }}
                            >
                                <FormattedMessage id="pages.ideas.openIdeas" />
                            </Button>
                        </div>
                    )}

                    <div className={classes.panel}>
                        <div className={classes.tabs}>
                            {TABS.map((type) => {
                                const Icon = TAB_ICONS[type]
                                const active = !showMine && tab === type
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`${classes.tab} ${active ? classes.tabActive : ""} ${
                                            type === "CAN_HELP" ? classes.tabSoft : ""
                                        } ${type === "PROJECT_IDEA" ? classes.tabLink : ""}`}
                                        onClick={() => {
                                            setShowMine(false)
                                            setTab(type)
                                        }}
                                    >
                                        <Icon size={16} stroke={1.7} />
                                        <FormattedMessage id={`pages.ideas.tabs.${type}`} />
                                    </button>
                                )
                            })}
                            <button
                                type="button"
                                className={`${classes.tab} ${classes.tabSoft} ${
                                    showMine ? classes.tabActive : ""
                                }`}
                                onClick={() => setShowMine(true)}
                            >
                                <IconHistory size={16} stroke={1.7} />
                                <FormattedMessage id="pages.ideas.myPosts" />
                            </button>
                        </div>
                        {showMine ? (
                            <Text size="sm" c="dimmed">
                                <FormattedMessage id="pages.ideas.myPostsHint" />
                            </Text>
                        ) : (
                            <div className={classes.filters}>
                                <TextInput
                                    leftSection={<IconSearch size={16} />}
                                    placeholder={intl.formatMessage({ id: "pages.ideas.searchPlaceholder" })}
                                    value={q}
                                    onChange={(e) => setQ(e.currentTarget.value)}
                                />
                                <CitySelect value={city} onChange={(v) => setCity(v || "")} />
                                <Select
                                    clearable
                                    searchable
                                    placeholder={intl.formatMessage({ id: "pages.ideas.programPlaceholder" })}
                                    data={programOptions}
                                    value={programCode}
                                    onChange={setProgramCode}
                                />
                            </div>
                        )}
                    </div>

                    <div className={classes.cards}>
                        {isLoading && (
                            <Text c="dimmed" ta="center" py="xl">
                                <FormattedMessage id="pages.ideas.loading" />
                            </Text>
                        )}
                        {postsError && !isLoading && (
                            <div className={classes.empty}>
                                <FormattedMessage id="pages.ideas.loadError" />
                            </div>
                        )}
                        {!isLoading && !postsError && posts.length === 0 && (
                            <div className={classes.empty}>
                                <FormattedMessage
                                    id={showMine ? "pages.ideas.myPostsEmpty" : "pages.ideas.empty"}
                                />
                            </div>
                        )}
                        {!isLoading && !postsError && posts.map(renderCard)}
                    </div>
                </div>

                <aside className={classes.sidebar}>
                    <Text fw={700}>
                        <FormattedMessage id="pages.ideas.myCard" />
                    </Text>
                    <div className={classes.profileHead}>
                        <Avatar
                            size={52}
                            radius="md"
                            src={user?.avatar?.link}
                            name={user?.fullName}
                            color="initials"
                        />
                        <div className={classes.profileMeta}>
                            <Text fw={650} lineClamp={1}>
                                {user?.fullName}
                            </Text>
                            <Text size="sm" c="dimmed" lineClamp={1}>
                                {user?.city || "—"}
                            </Text>
                        </div>
                    </div>
                    <TagsInput
                        label={intl.formatMessage({ id: "pages.ideas.skillsLabel" })}
                        placeholder={intl.formatMessage({ id: "pages.ideas.skillsPlaceholder" })}
                        value={skillsDraft}
                        onChange={(value) => {
                            setSkillsDraft(value)
                            setSkillsDirty(true)
                        }}
                        clearable
                    />
                    <Button
                        variant="light"
                        disabled={!skillsDirty}
                        loading={savingSkills}
                        onClick={() => saveSkills()}
                    >
                        <FormattedMessage id="pages.ideas.saveSkills" />
                    </Button>
                    {user?.username && (
                        <Button
                            component={Link}
                            to={`/profile/${user.username}`}
                            variant="subtle"
                            size="compact-sm"
                        >
                            <FormattedMessage id="pages.ideas.openProfile" />
                        </Button>
                    )}
                </aside>
            </div>

            <Modal
                opened={createOpen}
                onClose={() => setCreateOpen(false)}
                title={intl.formatMessage({ id: "pages.ideas.createTitle" })}
                centered
            >
                <form
                    className={classes.formStack}
                    onSubmit={createForm.onSubmit(() => createPost())}
                >
                    <Badge color={TYPE_BADGE[tab]} variant="light" w="fit-content">
                        <FormattedMessage id={`pages.ideas.types.${tab}`} />
                    </Badge>
                    <TextInput
                        label={intl.formatMessage({ id: "pages.ideas.fieldTitle" })}
                        {...createForm.getInputProps("title")}
                    />
                    <Textarea
                        label={intl.formatMessage({ id: "pages.ideas.fieldBody" })}
                        minRows={4}
                        autosize
                        {...createForm.getInputProps("body")}
                    />
                    <CitySelect
                        label={intl.formatMessage({ id: "pages.ideas.fieldCity" })}
                        value={createForm.values.city}
                        onChange={(v) => createForm.setFieldValue("city", v || "")}
                    />
                    <Select
                        clearable
                        searchable
                        label={intl.formatMessage({ id: "pages.ideas.fieldProgram" })}
                        data={programOptions}
                        value={createForm.values.programCode}
                        onChange={(v) => createForm.setFieldValue("programCode", v)}
                    />
                    <TagsInput
                        label={intl.formatMessage({ id: "pages.ideas.fieldSkills" })}
                        placeholder={intl.formatMessage({ id: "pages.ideas.skillsPlaceholder" })}
                        value={createForm.values.skills}
                        onChange={(v) => createForm.setFieldValue("skills", v)}
                    />
                    <Flex justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setCreateOpen(false)}>
                            <FormattedMessage id="pages.ideas.cancel" />
                        </Button>
                        <Button type="submit" loading={creating}>
                            <FormattedMessage id="pages.ideas.publish" />
                        </Button>
                    </Flex>
                </form>
            </Modal>

            <Modal
                opened={!!respondPost}
                onClose={() => setRespondPost(null)}
                title={intl.formatMessage({ id: "pages.ideas.respondTitle" })}
                centered
            >
                <div className={classes.formStack}>
                    {respondPost && (
                        <Text size="sm" c="dimmed">
                            {respondPost.title}
                        </Text>
                    )}
                    <Textarea
                        label={intl.formatMessage({ id: "pages.ideas.respondMessage" })}
                        minRows={3}
                        autosize
                        value={respondMessage}
                        onChange={(e) => setRespondMessage(e.currentTarget.value)}
                    />
                    <Flex justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setRespondPost(null)}>
                            <FormattedMessage id="pages.ideas.cancel" />
                        </Button>
                        <Button
                            loading={responding}
                            disabled={!respondMessage.trim()}
                            onClick={() => sendResponse()}
                        >
                            <FormattedMessage
                                id={respondPost ? respondLabelId(respondPost.type) : "pages.ideas.respond"}
                            />
                        </Button>
                    </Flex>
                </div>
            </Modal>

            <Modal
                opened={!!closeTarget}
                onClose={() => setCloseTarget(null)}
                title={intl.formatMessage({ id: "pages.ideas.close" })}
                centered
            >
                <div className={classes.formStack}>
                    {closeTarget && (
                        <Text size="sm" fw={600}>
                            {closeTarget.title}
                        </Text>
                    )}
                    <Text size="sm" c="dimmed">
                        <FormattedMessage id="pages.ideas.closeConfirm" />
                    </Text>
                    <Flex justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setCloseTarget(null)}>
                            <FormattedMessage id="pages.ideas.cancel" />
                        </Button>
                        <Button
                            color="gray"
                            loading={closing}
                            onClick={() => closeTarget && closePost(closeTarget.id)}
                        >
                            <FormattedMessage id="pages.ideas.close" />
                        </Button>
                    </Flex>
                </div>
            </Modal>

            <Modal
                opened={!!responsesPost}
                onClose={() => setResponsesPost(null)}
                title={intl.formatMessage({ id: "pages.ideas.viewResponses" })}
                centered
                size="lg"
            >
                <div className={classes.formStack}>
                    {responsesPost && (
                        <Text size="sm" c="dimmed">
                            {responsesPost.title}
                        </Text>
                    )}
                    {responsesLoading && (
                        <Text size="sm" c="dimmed">
                            <FormattedMessage id="pages.ideas.loading" />
                        </Text>
                    )}
                    {!responsesLoading && responseList.length === 0 && (
                        <Text size="sm" c="dimmed">
                            <FormattedMessage id="pages.ideas.responsesEmpty" />
                        </Text>
                    )}
                    {!responsesLoading &&
                        responseList.map((r) => (
                            <div key={r.id} className={classes.responseItem}>
                                <Text size="sm" fw={650}>
                                    {users[r.authorUsername]?.fullName ||
                                        r.authorFullName ||
                                        r.authorUsername}
                                </Text>
                                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                                    {r.message}
                                </Text>
                            </div>
                        ))}
                </div>
            </Modal>
        </div>
    )
}

export default IdeasPage
