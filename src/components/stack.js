import React from "react"


const Stack = ({children}) => {
    return (
        <>
            <div style={{width: '100%', float: 'left'}}>
                {children}
            </div>
        </>
    )
}

export default Stack
