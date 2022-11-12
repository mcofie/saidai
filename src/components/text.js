import React from "react"
import * as styles from './styles/text.module.css'

const Text = ({message}) => {
    return (<>
            <p className={styles.text}>
                {message}
            </p>
        </>)
}

export default Text
