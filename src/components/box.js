import React from "react"


const Box = ({children, position}) => {
    return (<>
        <div style={{float: position}}>
            {children}
        </div>
    </>)
}

export default Box
