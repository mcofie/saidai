import * as React from "react"
import Layout from '@layout/layout'
import Hero from '@components/hero'
import Identity from '@components/identity'
import Box from '@components/box'
import Content from '@components/content'


const IndexPage = () => {
    return (
        <>
            <Layout>
                <Box>
                    <Hero title={"最大"} subTitle={'he/him'}/>
                </Box>
                {/*First Box*/}
                <Box>
                    <Content>
                        <p style={{textAlign: 'left'}}>
                            Typically not your typical Frontend Engineer ( web & mobile) <br/>
                            from Accra, Ghana, with a sharp focus on building user centred <br/>
                            experiences realised through design systems.
                        </p>
                    </Content>
                </Box>
                <Box>
                    <Content>
                        <p style={{textAlign: 'left'}}>
                            I seek to marry these two faculties UX Engineer & UX Designer.
                        </p>
                    </Content>
                </Box>
                <Box>
                    <Content>
                        <p style={{textAlign: 'left'}}>
                            I like to tinker with ideas which sometimes become products,<br/>
                            help when I can, try to read occasionally, write when I’m inspired <br/>
                            and try to live whiles doing all these.
                        </p>
                    </Content>
                </Box>
                <Box>
                    <Identity title={'COFIE'} subTitle={'Maxwell Nii Offei'}/>
                </Box>
            </Layout>
        </>
    )
}

export default IndexPage

export const Head = () => <title> 最大 - Maxwell Cofie</title>
