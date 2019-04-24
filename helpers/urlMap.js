const { DeliveryClient } = require('kentico-cloud-delivery');
const { deliveryConfig } = require('../config');
const cache = require('memory-cache');
let fields = ['codename', 'url'];
let globalConfig;

// Define length of url for specific content types (number of path elements)
const typeLevels = {
    home: {
        urlLength: 0
    },
    navigation_item: {
        urlLength: 1
    },
    scenario: {
        urlLength: 2
    },
    topic: {
        urlLength: 3
    },
    article: {
        urlLength: 4
    },
    multiplatform_article: {
        urlLength: 4
    }
};

const getMapItem = (data) => {
    let item = {};

    fields.forEach(field => {
        switch (field) {
            case 'codename':
                item.codename = data.codename;
                break;
            case 'url':
                item.url = data.url;
                break;
            case 'date':
                item.date = data.date;
                break;
        };
    });

    return item;
};

const redefineTypeLevel = (response) => {
    let level = 4;
    if (response.system && response.system.type === 'multiplatform_article') {
      level = 5;
    }

    return level;
  };

const handleLangForMultiplatformArticle = (queryString, item) => {
    queryString = '?lang=';
    const cachedPlatforms = cache.get('platformsConfig');
    if (cachedPlatforms && cachedPlatforms.length) {
      let tempPlatform = cachedPlatforms[0].options.filter(elem => item.elements.platform.value[0].codename === elem.platform.value[0].codename);
      if (tempPlatform.length) {
        queryString += tempPlatform[0].url.value;
      }
    }

    return queryString;
};

const processLangForPlatformField = (elem, settings, cachedPlatforms) => {
    settings.queryString = '?lang=';
    if (cachedPlatforms && cachedPlatforms.length) {
        settings.queryString += cachedPlatforms[0].options.filter(plat => elem.codename === plat.system.codename)[0].url.value;
    }
    settings.urlMap = addItemToMap(settings);
    return settings;
}

const handleLangForPlatformField = (settings) => {
    if (settings.item.elements.platform.value) {
        settings.slug = settings.item.elements.url.value;
        settings.url[settings.url.length - 1] = settings.slug;
        const cachedPlatforms = cache.get('platformsConfig');

        // Add url to map for each platform in an article
        settings.item.elements.platform.value.forEach((elem) => {
            settings = processLangForPlatformField(elem, settings, cachedPlatforms);
        });
    }

    return {
        urlMap: settings.urlMap,
        slug: settings.slug,
        url: settings.url
    };
};

const addItemToMap = (settings) => {
    settings.urlMap.push(getMapItem({
      codename: settings.item.system.codename,
      url: `/${settings.url.join('/')}${settings.queryString}`,
      date: settings.item.system.last_modified
    }, fields));

    return settings.urlMap;
};

const handleNode = (settings) => {
    typeLevels.article.urlLength = redefineTypeLevel(settings.response);

    if (settings.item.elements.url && typeLevels[settings.item.system.type]) {
        settings.url.length = typeLevels[settings.item.system.type].urlLength;
        let slug = '';

        if (settings.response.system && settings.response.system.type === 'multiplatform_article') {
            // Handle "lang" query string in case articles are assigned to "multiplatform_article"
            settings.queryString = handleLangForMultiplatformArticle(settings.queryString, settings.item);
        } else if (settings.item.system && settings.item.system.type === 'article' && globalConfig.isSitemap) {
            // Handle "lang" query string in case "article" has values selected in the "Platform" field
            let tempProperties = handleLangForPlatformField({ item: settings.item, slug, url: settings.url, urlMap: settings.urlMap });
            settings.urlMap = tempProperties.urlMap;
            slug = tempProperties.slug;
            settings.url = tempProperties.url;
        } else {
            slug = settings.item.elements.url.value;
        }

        if (slug) {
            settings.url[settings.url.length - 1] = slug;
        } else {
            settings.url.length = settings.url.length - 1;
        }
    }

    // Add url to map
    if (typeLevels[settings.item.system.type]) {
        settings.urlMap = addItemToMap({ urlMap: settings.urlMap, item: settings.item, url: settings.url, queryString: settings.queryString });
    }

    settings.queryString = '';

    return createUrlMap(settings.item, settings.url, settings.urlMap);
};

const createUrlMap = (response, url, urlMap = []) => {
    let node = '';
    let queryString = '';

    if (response.items) node = 'items';
    if (response.navigation) node = 'navigation';
    if (response.children) node = 'children';

    if (response[node]) {
        response[node].forEach(item => {
            urlMap = handleNode({ response, item, urlMap, url, queryString });
        });
    }

    return urlMap;
};

const getUrlMap = async (config) => {
    globalConfig = config;
    deliveryConfig.projectId = config.projectid;

    if (config.previewapikey) {
        deliveryConfig.previewApiKey = config.previewapikey;
        deliveryConfig.enablePreviewMode = true;
    }

    if (config.securedapikey) {
        deliveryConfig.securedApiKey = config.securedapikey;
        deliveryConfig.enableSecuredMode = true;
    }

    const deliveryClient = new DeliveryClient(deliveryConfig);

    const query = deliveryClient.items()
        .type('home')
        .depthParameter(5);

    const response = await query
        .getPromise();

    if (config.isSitemap) {
        fields = ['url', 'date'];
    } else {
        fields = ['codename', 'url'];
    }

    return createUrlMap(response, []);
};

module.exports = getUrlMap;
