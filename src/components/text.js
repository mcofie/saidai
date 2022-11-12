import React from "react"
import * as styles from './styles/text.module.css'

const Text = ({children}) => {
    return (<>
        <div className={styles.text}>
            {children}
        </div>
    </>)
}

export default Text
