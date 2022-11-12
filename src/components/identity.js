import React from "react"
import * as styles from './styles/identity.module.css'

const Identity = ({title, subTitle}) => {
    return (
        <>
            <div className={styles.identity}>
                <ul className={styles.identityAligned}>
                    <li><h3 className={styles.identity__subtitle}>{subTitle}</h3></li>
                    <li><h1 className={styles.identity__title}>{title}</h1></li>
                </ul>
            </div>
        </>
    )
}

export default Identity
