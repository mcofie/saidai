import * as React from "react"
import Layout from '@layout/layout'
import Hero from '@components/hero'
import Identity from '@components/identity'
import Box from '@components/box'
import Content from '@components/content'
import Stack from '@components/stack'
import Text from '@components/text'


const IndexPage = () => {
    return (
        <>
            <Layout>
                <Stack>
                    <Box position={'right'}>
                        <span className="material-symbols-outlined mt-4">light_mode</span>
                    </Box>
                </Stack>
                <Stack>
                    <Hero title={"最大"} subTitle={'he/him'}/>
                </Stack>
                {/*First Box*/}
                <Stack>
                    <Content>
                        <Text>
                            Typically not your typical Frontend Engineer ( web & mobile) <br/>
                            from Accra, Ghana, with a sharp focus on building user centred <br/>
                            experiences realised through <a href={"https://github.com/mcofie/Weeny"} target={'_blank'}>design
                            systems</a>.
                        </Text>
                    </Content>
                </Stack>
                <Stack>
                    <Content>
                        <Text>
                            I seek to marry these two faculties UX Engineer & UX Designer.
                        </Text>
                    </Content>
                </Stack>
                <Stack>
                    <Content>
                        <Text>
                            I like to tinker with ideas which sometimes
                            become <a
                            href={"https://purrfect-baron-20f.notion.site/Portfolio-5dc79c6d06ee404f9e7dd2f5ec05141d"}
                            target={'_blank'}>products</a>,<br/>
                            <a href={"https://skills-faculty.github.io/skillsfaculty.github.io/"}
                               target={'_blank'}>help</a> when I can, try to <a
                            href={"https://www.goodreads.com/user/show/108237344-maxwell-cofie"}
                            target={'_blank'}>read</a> occasionally, <a
                            href={"https://dev.to/mcofie"}
                            target={'_blank'}>write</a> when
                            I’m inspired <br/>
                            and be sure I live whiles doing all these.
                        </Text>
                    </Content>
                </Stack>
                <Stack>
                    <Identity title={'COFIE'} subTitle={'Maxwell Nii Offei'}/>
                </Stack>
            </Layout>
        </>
    )
}

export default IndexPage


export const Head = () => <title> 最大 - Maxwell Cofie</title>
