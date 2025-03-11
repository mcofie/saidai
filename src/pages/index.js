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
                            🚀 Turning big problems into bold solutions. Building tech-driven businesses that uplift,
                            move humanity forward and inspire.
                        </Text>
                    </Content>
                </Stack>
                <Stack>
                    <Content>
                        <Text>
                            I’d like to be the Priest that marries Tech 💻 and Business 👔 hoping they live happily ever
                            after.
                            Here to share the journey 🚀
                        </Text>
                    </Content>
                </Stack>
                <Stack>
                    <Content>
                        <Text>
                            I like to tinker with ideas which sometimes
                            become <a
                            href={"https://purrfect-baron-20f.notion.site/Portfolio-5dc79c6d06ee404f9e7dd2f5ec05141d"}
                            target={'_blank'}>businesses</a>,<br/>
                            <a href={"https://skills-faculty.github.io/skillsfaculty.github.io/"}
                               target={'_blank'}>help</a> when I can, try to <a
                            href={"https://www.goodreads.com/user/show/108237344-maxwell-cofie"}
                            target={'_blank'}>read</a> occasionally, <a
                            href={"https://dev.to/mcofie"}
                            target={'_blank'}>write</a> when
                            I’m inspired <br/>
                            and be sure I <a href={"https://www.instagram.com/mcofie/"} target={"_blank"}>live</a> whiles doing all these.
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
