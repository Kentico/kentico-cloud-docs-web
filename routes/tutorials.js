const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const moment = require('moment');

const requestDelivery = require('../helpers/requestDelivery');
const minify = require('../helpers/minify');
const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');
const handleCache = require('../helpers/handleCache');
const platforms = require('../helpers/platforms');
const getUrlMap = require('../helpers/urlMap');
const getTrainingCourseInfo = require('../helpers/trainingCourse');
const customRichTextResolver = require('../helpers/customRichTextResolver');

let cookiesPlatform;

const getSubNavigationLevels = (req) => {
    return [
        typeof req.params.scenario !== 'undefined' ? req.params.scenario : null,
        typeof req.params.topic !== 'undefined' ? req.params.topic : null,
        typeof req.params.article !== 'undefined' ? req.params.article : null,
        typeof req.params.platform !== 'undefined' ? req.params.platform : null
    ];
};

const getContentLevel = async (currentLevel, codename, urlMap, req, res) => {
    const KCDetails = commonContent.getKCDetails(res);

    const settings = {
        codename: codename,
        depth: 2,
        ...KCDetails
    };

    if (currentLevel === -1) {
        settings.type = 'navigation_item';
        delete settings.depth;
    } else if (currentLevel === 0) {
        settings.resolveRichText = true;
        settings.urlMap = urlMap;
    } else if (currentLevel === 1) {
        settings.type = 'topic';
    } else if (currentLevel === 2) {
        settings.resolveRichText = true;
        settings.urlMap = urlMap;
    }

    if (!settings.codename) {
        settings.slug = getSubNavigationLevels(req)[currentLevel]
    }

    return await handleCache.evaluateSingle(res, settings.codename, async () => {
        return await requestDelivery(settings);
    });
};

const getCurrentLevel = (levels) => {
    let index = levels.length;
    // Get last non-null array item index
    while (index-- && !levels[index]);
    return index;
};

const getContent = async (req, res) => {
    const KCDetails = commonContent.getKCDetails(res);

    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
        return await getUrlMap(res);
    });
    const home = await handleCache.ensureSingle(res, 'home', async () => {
        return await commonContent.getHome(res);
    });

    let slug = req.originalUrl.split('/')[1];
    slug = slug.split('?')[0];
    const subnavCodename = helper.getCodenameByUrl(`/${slug}`, urlMap);

    let subNavigation;
    if (subnavCodename) {
        subNavigation = await handleCache.evaluateSingle(res, `subNavigation_${subnavCodename}`, async () => {
            return await commonContent.getSubNavigation(res, subnavCodename);
        });
    }

    const footer = await handleCache.ensureSingle(res, 'footer', async () => {
        return await commonContent.getFooter(res);
    });
    const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
        return await commonContent.getUIMessages(res);
    });
    const articles = await handleCache.ensureSingle(res, 'articles', async () => {
        return await commonContent.getArticles(res);
    });
    const references = await handleCache.ensureSingle(res, 'apiSpecifications', async () => {
        return await commonContent.getReferences(res);
    });
    const termDefinitions = await handleCache.evaluateSingle(res, 'termDefinitions', async () => {
        return await commonContent.getTermDefinitions(res);
    });

    const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);
    const itemCodename = helper.getCodenameByUrl(req.originalUrl, urlMap);
    const subNavigationLevels = getSubNavigationLevels(req);
    const currentLevel = getCurrentLevel(subNavigationLevels);

    let content = await getContentLevel(currentLevel, itemCodename, urlMap, req, res);
    let view = 'tutorials/pages/article';
    let availablePlatforms;
    let trainingCourseInfo;

    const queryHash = req.url.split('?')[1];
    const platformsConfig = await platforms.getPlatformsConfig(res);
    let preselectedPlatform;
    let canonicalUrl;
    cookiesPlatform = req.cookies['KCDOCS.preselectedLanguage'];

    if (content && content.length) {
        if (currentLevel === -1) {
            return `/${slug}/${content[0].children.value[0].url.value}${queryHash ? '?' + queryHash : ''}`;
        } else if (currentLevel === 0 && content[0].system.type !== 'multiplatform_article') {
            if (content[0].system.type === 'certification') {
                view = 'tutorials/pages/certification';
            } else if (content[0].system.type === 'training_course') {
                view = 'tutorials/pages/trainingCourse';
                trainingCourseInfo = await getTrainingCourseInfo(content[0], req, res);
            } else if (content[0].system.type === 'scenario') {
                view = 'tutorials/pages/scenario';
            }
        } else if (currentLevel === 1) {
            return `/${slug}/${subNavigationLevels[currentLevel - 1]}/${subNavigationLevels[currentLevel]}/${content[0].children.value[0].url.value}${queryHash ? '?' + queryHash : ''}`;
        } else {
            const preselectedPlatformSettings = await platforms.getPreselectedPlatform(content[0], cookiesPlatform, req, res);

            if (!preselectedPlatformSettings) {
                return null;
            }

            preselectedPlatform = preselectedPlatformSettings.preselectedPlatform;
            cookiesPlatform = preselectedPlatformSettings.cookiesPlatform;

            if (cookiesPlatform !== req.cookies['KCDOCS.preselectedLanguage']) {
                res.cookie('KCDOCS.preselectedLanguage', cookiesPlatform);
            }

            canonicalUrl = platforms.getCanonicalUrl(urlMap, content[0], preselectedPlatform);

            if (content[0].system.type === 'multiplatform_article') {
                const multiplatformArticleContent = await platforms.getMultiplatformArticleContent(content, preselectedPlatform, urlMap, KCDetails, res);

               if (!multiplatformArticleContent) {
                   return null;
               }

               content = multiplatformArticleContent.content;
               availablePlatforms = multiplatformArticleContent.availablePlatforms;
            }

            preselectedPlatform = platforms.getPreselectedPlatformByConfig(preselectedPlatform, platformsConfig);
        }
    } else {
        return null;
    }

    // If only article url slug in passed and item is present in the navigation, do not render the article
    const isExcludedNavigation = urlMap.filter(item => (item.codename === content[0].system.codename) && (item.url.startsWith('/other/'))).length > 0;
    if (!req.params.scenario && !req.params.topic && req.params.article && !isExcludedNavigation) {
        return null;
    }

    if (content && content.length) {
        const titleItems = [...articles, ...references];

        if (content[0].introduction) {
            content[0].introduction.value = helper.addTitlesToLinks(content[0].introduction.value, urlMap, titleItems);
        }

        if (content[0].description) {
            content[0].description.value = helper.addTitlesToLinks(content[0].description.value, urlMap, titleItems);
        }

        if (content[0].content) {
            content[0].content.value = helper.addTitlesToLinks(content[0].content.value, urlMap, titleItems);
        }

        if (content[0].next_steps) {
            content[0].next_steps.value = helper.addTitlesToLinks(content[0].next_steps.value, urlMap, titleItems);
        }
    }

    let containsChangelog;
    let containsTerminology;
    let releaseNoteContentType;
    if (content && content.length && content[0].content) {
        containsChangelog = helper.hasLinkedItemOfType(content[0].content, 'changelog');
        containsTerminology = helper.hasLinkedItemOfType(content[0].content, 'terminology');

        if (containsChangelog) {
            req.app.locals.changelogPath = helper.getPathWithoutQS(req.originalUrl);
            releaseNoteContentType = await handleCache.evaluateSingle(res, 'releaseNoteContentType', async () => {
                return await commonContent.getReleaseNoteType(res);
            });
        }

        if (containsTerminology) {
            req.app.locals.terminologyPath = helper.getPathWithoutQS(req.originalUrl);
        }

        content[0].content.value = await customRichTextResolver(content[0].content.value, req, res);
    }

    return {
        view: view,
        req: req,
        res: res,
        moment: moment,
        minify: minify,
        slug: content && content.length ? content[0].url.value : '',
        isPreview: KCDetails.isPreview,
        isKenticoIP: helper.isKenticoIP(req),
        projectId: res.locals.projectid,
        title: content && content.length ? content[0].title.value : '',
        titleSuffix: ` | ${home && home.length ? home[0].title.value : 'Kentico Kontent Docs'}`,
        description: content && content.length && content[0].introduction ? helper.stripTags(content[0].introduction.value).substring(0, 300) : '',
        platform: content && content.length && content[0].platform && content[0].platform.value.length ? await commonContent.normalizePlatforms(content[0].platform.value, res) : null,
        availablePlatforms: await commonContent.normalizePlatforms(availablePlatforms, res),
        selectedPlatform: platforms.getSelectedPlatform(platformsConfig, cookiesPlatform),
        canonicalUrl: canonicalUrl,
        introduction: content && content.length && content[0].introduction ? content[0].introduction.value : '',
        nextSteps: content && content.length && content[0].next_steps ? content[0].next_steps : '',
        navigation: home && home.length ? home[0].navigation.value : [],
        subNavigation: subNavigation && subNavigation.length ? subNavigation[0].children.value : [],
        subNavigationLevels: subNavigationLevels,
        content: content && content.length ? content[0] : null,
        footer: footer && footer.length ? footer[0] : null,
        UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
        platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
        termDefinitions: termDefinitions && termDefinitions.length ? termDefinitions : null,
        helper: helper,
        getFormValue: helper.getFormValue,
        preselectedPlatform: preselectedPlatform,
        containsChangelog: containsChangelog,
        releaseNoteContentType: releaseNoteContentType,
        trainingCourseInfo: trainingCourseInfo
    };
};

router.get(['/other/:article', '/:main', '/:main/:scenario', '/:main/:scenario/:topic', '/:main/:scenario/:topic/:article'], asyncHandler(async (req, res, next) => {
    if (res.locals.router !== 'tutorials') {
        return next();
    }

    const data = await getContent(req, res, next);
    if (data && !data.view) return res.redirect(301, data);
    if (!data) return next();
    return res.render(data.view, data);
}));

module.exports = router;
