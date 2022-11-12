/**
 * @type {import('gatsby').GatsbyConfig}
 */
const path = require('path')

module.exports = {
    pathPrefix: '/saidai',
    siteMetadata: {
        title: `Saidai`,
        siteUrl: `https://www.maxwellcofie.com`
    },
    plugins: [
        "gatsby-plugin-sitemap", {
            resolve: 'gatsby-plugin-manifest',
            options: {
                "icon": "src/images/icon.png"
            }
        },
        {
            resolve: `gatsby-plugin-alias-imports`,
            options: {
                alias: {
                    "@layout": path.resolve(__dirname, "src/layouts"),
                    "@components": path.resolve(__dirname, "src/components"),
                },
                extensions: [
                    "js", "css",
                ],
            }
        }
    ]
};

