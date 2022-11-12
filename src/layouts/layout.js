import React from "react"
import * as layoutStyles from "./layout.module.css"
import "../components/global.module.css"

export default function Layout({children}) {
    return <div className={layoutStyles.container}>{children}</div>
}
