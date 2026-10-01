import React from "react"
import { FormattedMessage } from "react-intl"
import { VOL_ID_BG, VOL_ID_LOGO, VolIdCardData } from "src/shared/docs/volId"
import classes from "./VolIdCard.module.scss"

type Props = {
    card: VolIdCardData
    qrDataUrl: string | null
    side: "front" | "back"
    large?: boolean
}

export const VolIdCard: React.FC<Props> = ({ card, qrDataUrl, side, large }) => {
    return (
        <article
            className={`${classes.card} ${large ? classes.large : ""} ${side === "back" ? classes.back : classes.front}`}
            aria-label={side === "front" ? "VOL-ID front" : "VOL-ID back"}
        >
            <img src={VOL_ID_BG} alt="" className={classes.bg} />

            {side === "front" ? (
                <>
                    <header className={classes.header}>
                        <img src={VOL_ID_LOGO} alt="" className={classes.logo} />
                        <div className={classes.titles}>
                            <div className={classes.mainTitle}>VOLUNTEER ID CARD</div>
                            <div className={classes.org}>{card.orgTitle}</div>
                        </div>
                        <div className={classes.volMark}>VOL-ID</div>
                    </header>

                    <div className={classes.body}>
                        <div className={classes.photoWrap}>
                            {card.photoUrl ? (
                                <img src={card.photoUrl} alt="" className={classes.photo} />
                            ) : (
                                <div className={classes.photoPlaceholder}>
                                    {(card.name[0] || "?").toUpperCase()}
                                </div>
                            )}
                        </div>
                        <ol className={classes.fields}>
                            <li>
                                <span className={classes.fieldInner}>
                                    <span className={classes.label}>Име и презиме / Name</span>
                                    <strong className={classes.name}>{card.name}</strong>
                                </span>
                            </li>
                            <li>
                                <span className={classes.fieldInner}>
                                    <span className={classes.label}>Број картице / Card number</span>
                                    <span className={classes.valueMono}>{card.cardNumber}</span>
                                </span>
                            </li>
                            <li>
                                <span className={classes.fieldInner}>
                                    <span className={classes.label}>Волонтер од / Volunteer since</span>
                                    <span className={classes.value}>{card.sinceYear}</span>
                                </span>
                            </li>
                            <li>
                                <span className={classes.fieldInner}>
                                    <span className={classes.label}>Издата / Issued</span>
                                    <span className={classes.value}>{card.issuedLabel}</span>
                                </span>
                            </li>
                            <li>
                                <span className={classes.fieldInner}>
                                    <span className={classes.label}>Важи до / Valid until</span>
                                    <span className={classes.value}>{card.validUntilLabel}</span>
                                </span>
                            </li>
                        </ol>
                    </div>
                </>
            ) : (
                <>
                    <header className={classes.header}>
                        <img src={VOL_ID_LOGO} alt="" className={classes.logo} />
                        <div className={classes.titles}>
                            <div className={classes.orgBack}>VOL-ID · ПРОВЕРА / VERIFICATION</div>
                        </div>
                    </header>
                    <div className={classes.backBody}>
                        <div className={classes.qrBlock}>
                            {qrDataUrl ? (
                                <img src={qrDataUrl} alt="QR" className={classes.qr} />
                            ) : (
                                <div className={classes.qrPlaceholder} />
                            )}
                        </div>
                        <div className={classes.backText}>
                            <p>Скенирајте QR код за проверу важења картице.</p>
                            <p className={classes.en}>Scan the QR code to verify card validity.</p>
                            <p className={classes.portal}>portal.russian.rs</p>
                            <p className={classes.partners}>
                                <FormattedMessage id="pages.volId.partners" />
                            </p>
                        </div>
                    </div>
                    <footer className={classes.footer}>
                        <span>Картица удружења. Није јавна исправа.</span>
                    </footer>
                </>
            )}
        </article>
    )
}
