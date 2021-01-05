const express = require('express');
const router = express.Router();

const minify = require('../helpers/minify');
const isPreview = require('../helpers/isPreview');
const commonContent = require('../helpers/commonContent');
const helper = require('../helpers/helperFunctions');
const handleCache = require('../helpers/handleCache');
const asyncHandler = require('express-async-handler');

router.get('/', asyncHandler(async (req, res, next) => {
  const home = await handleCache.ensureSingle(res, 'home', async () => {
    return commonContent.getHome(res);
  });

  if (!home[0]) {
    return next();
  }

  const footer = await handleCache.ensureSingle(res, 'footer', async () => {
    return commonContent.getFooter(res);
  });
  const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return commonContent.getUIMessages(res);
  });
  const platformsConfigPairings = await commonContent.getPlatformsConfigPairings(res);

  return res.render('tutorials/pages/home-instantsearch', {
    req: req,
    minify: minify,
    slug: 'home',
    isPreview: isPreview(res.locals.previewapikey),
    title: home[0].title.value,
    titleSuffix: '',
    description: helper.stripTags(home[0].description.value).substring(0, 300),
    navigation: home[0].navigation.value,
    introNote: home[0].intro_note.value,
    signposts: home[0].signposts.value,
    support: home[0].support.value,
    footer: footer && footer.length ? footer[0] : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
    helper: helper
  });
}));

module.exports = router;