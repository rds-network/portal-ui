import { Anchor, Card, Flex, SegmentedControl, Text, Title } from "@mantine/core"
import React, { useState } from "react"
import classes from "./CleanCityDocs.module.scss"

const ECO = "https://calm-breeze-c3ec.ta05021997.workers.dev"
const DOCS = {
    volunteer: "https://ekomapa.rs/docs/clean-city-volunteer.html",
    user: "https://ekomapa.rs/docs/portal-user.html",
    curator: "https://ekomapa.rs/docs/portal-curator.html",
}

type Tab = "volunteer" | "user" | "curator"

const Step: React.FC<{ n: number; title: string; children: React.ReactNode; img?: string; alt?: string }> = ({
    n,
    title,
    children,
    img,
    alt,
}) => (
    <Card withBorder radius="lg" p="lg" className={classes.step}>
        <Flex gap="sm" align="flex-start">
            <span className={classes.num}>{n}</span>
            <div className={classes.stepBody}>
                <Title order={4}>{title}</Title>
                <div className={classes.prose}>{children}</div>
                {img && <img src={img} alt={alt || title} className={classes.shot} />}
            </div>
        </Flex>
    </Card>
)

export const CleanCityDocs: React.FC = () => {
    const [tab, setTab] = useState<Tab>("volunteer")

    return (
        <div className={classes.docs}>
            <header className={classes.hero}>
                <Title order={2}>Программа «Чистый город» — руководство волонтёра</Title>
                <Text mt={8}>
                    Подготовка уборки, фиксация точки на карте Экомапы и еженедельная отчётность на портале
                    волонтёрства.
                </Text>
                <SegmentedControl
                    mt="md"
                    value={tab}
                    onChange={(value) => setTab(value as Tab)}
                    data={[
                        { value: "user", label: "Пользователь" },
                        { value: "volunteer", label: "Чистый город" },
                        { value: "curator", label: "Куратор" },
                    ]}
                />
            </header>

            <Text className={classes.lead}>
                Документ объединяет методические требования программы и актуальный порядок работы с{" "}
                <Anchor href={DOCS.volunteer} target="_blank">
                    Экомапой
                </Anchor>
                , порталом волонтёров и облаком. Старая инструкция с папками на files.russian.rs для обычных уборок не
                действует.
            </Text>

            {tab === "volunteer" && (
                <Flex direction="column" gap="md">
                    <Title order={3}>Часть I. Подготовка к уборке на месте</Title>
                    <Step n={1} title="Выбор места уборки">
                        <p>
                            Волонтёр сам выбирает участок: двор, парк, сквер, бульвар, набережная, дорога, детская
                            площадка. Не рекомендуется территория коммерческих организаций. Запрещены участки, куда
                            закрыт доступ (стройка, частная территория).
                        </p>
                    </Step>
                    <Step n={2} title="Границы и оценка">
                        <p>
                            Обозначьте пределы участка. Оцените объём и тип мусора. Большую свалку, которую нельзя убрать
                            самим, фиксируйте в{" "}
                            <Anchor href="https://forms.gle/Qa8nxn4KGCTd8WKh7" target="_blank">
                                форме мониторинга
                            </Anchor>
                            .
                        </p>
                    </Step>
                    <Step n={3} title="Фото до и после">
                        <p>
                            Снимайте с одной точки: до, после и мешки. Людей и детей в кадре быть не должно. Фото
                            хранятся на Экомапе, не в облаке и не файлами на портале.
                        </p>
                    </Step>

                    <Title order={3}>Часть II. Точка на Экомапе</Title>
                    <Step n={1} title="Добавить точку на карте" img={`${ECO}/eco-03-pick-location.jpg`}>
                        <p>
                            Откройте{" "}
                            <Anchor href="https://ekomapa.rs/" target="_blank">
                                ekomapa.rs
                            </Anchor>
                            , войдите через портал волонтёров, кликните место уборки. Категория — «Программа «Чистый
                            город»». Круг на карте — радиус зоны.
                        </p>
                    </Step>
                    <Step n={2} title="Заполнение и отправка" img={`${ECO}/eco-05-point-form.jpg`}>
                        <p>
                            Задайте радиус, краткое описание, загрузите до 5 фото «до» и нажмите «Добавить точку». После
                            уборки в «Мои точки» загрузите «после», мешки и литры и отправьте на модерацию.
                        </p>
                    </Step>
                    <Step n={3} title="Пары фото" img={`${ECO}/eco-08-photo-pairs.jpg`}>
                        <p>
                            Перед отчётом на портале соберите пары с одного ракурса. Без одобренной точки отчёт на
                            портале не примут. Проверка точки — до 24 часов.
                        </p>
                    </Step>
                    <Anchor href={DOCS.volunteer} target="_blank" fw={650}>
                        Полная инструкция: ekomapa.rs/docs/clean-city-volunteer.html
                    </Anchor>
                </Flex>
            )}

            {tab === "user" && (
                <Flex direction="column" gap="md">
                    <Title order={3}>Как сдать отчёт на портале</Title>
                    <Step n={1} title="Новый отчёт" img={`${ECO}/portal-02-new-report.jpg`}>
                        <p>
                            За неделю — один отчёт. Кнопка «Новый отчёт». Скопируйте с Экомапы код точки, координаты,
                            описание и ссылку на карту.
                        </p>
                    </Step>
                    <Step n={2} title="Поля задачи" img={`${ECO}/portal-04-report-fields.jpg`}>
                        <p>
                            Название — код и место. Описание — вставка с Экомапы. Результат — ссылка на точку. Часы и
                            дата по локации. Заказчик и файлы не нужны. Несколько уборок — несколько задач в одном
                            отчёте.
                        </p>
                    </Step>
                    <Step n={3} title="Отправка">
                        <p>
                            «Отправить отчёт». Проверка модератором портала — до 7 дней. Облако только для нетиповых
                            задач.
                        </p>
                    </Step>
                    <Anchor href={DOCS.user} target="_blank" fw={650}>
                        Полная инструкция: ekomapa.rs/docs/portal-user.html
                    </Anchor>
                </Flex>
            )}

            {tab === "curator" && (
                <Flex direction="column" gap="md">
                    <Title order={3}>Для куратора</Title>
                    <Step n={1} title="Что проверять">
                        <p>
                            Точка на Экомапе одобрена, пары фото с одного ракурса, литры указаны, на портале один отчёт
                            за неделю с задачами по локациям. Файлы к обычной уборке на портале не прикладывают.
                        </p>
                    </Step>
                    <Step n={2} title="Тепловая карта">
                        <p>
                            В карту попадают только волонтёры с действующим обычным договором. Ассоциированные и те, у
                            кого договор закончился, в отчётность карты не ставятся.
                        </p>
                    </Step>
                    <Anchor href={DOCS.curator} target="_blank" fw={650}>
                        Полная инструкция: ekomapa.rs/docs/portal-curator.html
                    </Anchor>
                </Flex>
            )}
        </div>
    )
}
