import React from 'react';
import * as styles from './styles/hero.module.css'


const Hero = ({title, subTitle}) => {
    return (
        <>
            <div className={styles.hero}>
                <ul className={styles.heroAligned}>
                    <li><h1 className={styles.hero__title}>{title}</h1></li>
                    <li><p className={styles.hero__subtitle}>{subTitle}</p></li>
                </ul>
            </div>
        </>
    )
}

export default Hero
