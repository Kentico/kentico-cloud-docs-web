const requestDelivery = require('../helpers/requestDelivery');
const cache = require('memory-cache');

const commonContent = {
    getKCDetails: (res) => {
        return {
            projectid: res.locals.projectid,
            previewapikey: res.locals.previewapikey,
            securedapikey: res.locals.securedapikey
        };
    },
    getTree: async (contentType, depth, res) => {
        const KCDetails = commonContent.getKCDetails(res);
        return await requestDelivery({
            type: contentType,
            depth: depth,
            resolveRichText: true,
            urlMap: cache.get(`urlMap_${KCDetails.projectid}`),
            ...KCDetails
        });
    },
    getFooter: async (res) => {
        return await requestDelivery({
            type: 'footer',
            ...commonContent.getKCDetails(res)
        });
    },
    getUIMessages: async (res) => {
        return await requestDelivery({
            type: 'ui_messages',
            resolveRichText: true,
            ...commonContent.getKCDetails(res)
        });
    },
    getHome: async (res) => {
        const KCDetails = commonContent.getKCDetails(res);
        return await requestDelivery({
            type: 'home',
            depth: 4,
            resolveRichText: true,
            urlMap: cache.get(`urlMap_${KCDetails.projectid}`),
            ...KCDetails
        });
    },
    getArticles: async (res) => {
        return await requestDelivery({
            type: 'article',
            ...commonContent.getKCDetails(res)
        });
    },
    getRSSArticles: async (res) => {
        return await requestDelivery({
            type: 'article',
            limit: 20,
            order: {
                type: 'descending',
                field: 'system.last_modified'
            },
            ...commonContent.getKCDetails(res)
        });
    },
    getCertification: async (res) => {
        return await requestDelivery({
            type: 'certification',
            ...commonContent.getKCDetails(res)
        });
    },
    getNotFound: async (res) => {
        const KCDetails = commonContent.getKCDetails(res);
        return await requestDelivery({
            type: 'not_found',
            resolveRichText: true,
            urlMap: cache.get(`urlMap_${KCDetails.projectid}`),
            ...KCDetails
        });
    },
    getPlatformsConfig: async (res) => {
        return await requestDelivery({
            type: 'platform_picker',
            codename: 'platform_picker',
            ...commonContent.getKCDetails(res)
        });
    },
    normalizePlatforms: async (platforms, res) => {
        const KCDetails = commonContent.getKCDetails(res);

        let result = [];
        let order = [];
        let cachedPlatforms = cache.get(`platformsConfig_${KCDetails.projectid}`);

        if (!cachedPlatforms) {
            cachedPlatforms = await commonContent.getPlatformsConfig(res);
        }

        if (platforms && cachedPlatforms && cachedPlatforms.length) {
            cachedPlatforms[0].options.forEach((item) => {
                let platform = {
                    title: item.title.value,
                    slug: item.url.value,
                    codename: item.platform.value[0].codename
                }
                order.push(platform);
            });

            order.forEach(orderItem => {
                platforms.forEach(platformItem => {
                    let codenameTemp = platformItem.platform && platformItem.platform.value.length ? platformItem.platform.value[0].codename : null;
                    let codename = platformItem.codename || codenameTemp;
                    if (orderItem.codename === codename) {
                        result.push(orderItem);
                    }
                });
            });
        }

        return result;
    }
}

module.exports = commonContent;
