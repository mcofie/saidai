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
        },
        `gatsby-transformer-remark`,
        {
            resolve: `gatsby-plugin-google-analytics`,
            options: {
                // The property ID; the tracking code won't be generated without it
                trackingId: "G-QJF9GMTBXT",
                // Defines where to place the tracking script - `true` in the head and `false` in the body
                head: true,
                // Setting this parameter is optional
                anonymize: true,
                // Setting this parameter is also optional
                respectDNT: true,
                // Avoids sending pageview hits from custom paths
                exclude: ["/preview/**", "/do-not-track/me/too/"],
                // Delays sending pageview hits on route update (in milliseconds)
                pageTransitionDelay: 0,
                // Enables Google Optimize using your container Id
                optimizeId: "YOUR_GOOGLE_OPTIMIZE_TRACKING_ID",
                // Enables Google Optimize Experiment ID
                experimentId: "YOUR_GOOGLE_EXPERIMENT_ID",
                // Set Variation ID. 0 for original 1,2,3....
                variationId: "YOUR_GOOGLE_OPTIMIZE_VARIATION_ID",
                // Defers execution of google analytics script after page load
                defer: false,
                // Any additional optional fields
                sampleRate: 5,
                siteSpeedSampleRate: 10,
                cookieDomain: "maxwellcofie.com",
                // defaults to false
                enableWebVitalsTracking: true,
            },
        },
    ]
};

