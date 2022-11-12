import React from "react"


const Box = ({children}) => {
    return (<>
        <div style={{width: '100%', float: 'left'}}>
            {children}
        </div>
    </>)
}

export default Box
