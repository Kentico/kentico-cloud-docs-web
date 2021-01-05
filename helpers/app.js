const cache = require('memory-cache');
const handleCache = require('./handleCache');
const getUrlMap = require('./urlMap');

// URLs allowed in the application
const urlWhitelist = [
  '/other/*',
  '/form/*',
  '/urlmap',
  '/kentico-icons.min.css',
  '/favicon.ico',
  '/api-reference',
  '/rss/*',
  '/redirect-urls',
  '/cache-invalidate',
  '/robots.txt',
  '/link-to',
  '/sitemap.xml',
  '/pdf',
  '/login',
  '/logout',
  '/callback',
  '/elearning',
  '/elearning/*',
  '/instantsearch'
];

const appHelper = {
  pageExists: async (req, res) => {
    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
      return await getUrlMap(res);
    });

    const path = req.originalUrl.split('?')[0];
    let exists = false;

    urlMap.forEach((item) => {
      const itemPath = item.url.split('?')[0];

      if (itemPath === path) {
        exists = true;
      }
    });

    if (!exists) {
      urlWhitelist.forEach((item) => {
        let itemPath = item.split('#')[0];
        itemPath = itemPath.split('?')[0];

        if (itemPath === path) {
          exists = true;
        } else if (itemPath.endsWith('/*')) {
          itemPath = itemPath.slice(0, -1);

          if (path.startsWith(itemPath)) {
            exists = true;
          }
        }
      });
    }

    return exists;
  },
  handleKCKeys: (req, res) => {
    if (typeof req.query.projectid !== 'undefined') {
      res.locals.projectid = req.query.projectid;
    } else {
      res.locals.projectid = process.env['KC.ProjectId'];
    }

    if (typeof req.query.previewapikey !== 'undefined') {
      res.locals.previewapikey = req.query.previewapikey;
    } else {
      res.locals.previewapikey = process.env['KC.PreviewApiKey'];
    }

    if (typeof req.query.securedapikey !== 'undefined') {
      res.locals.securedapikey = req.query.securedapikey;
    } else {
      res.locals.securedapikey = process.env['KC.SecuredApiKey'];
    }
  },
  isOneOfCacheRevalidate: (req) => {
    const urls = [
      '/reference/',
      '/rss/',
      '/tutorials/',
      '/certification/',
      '/e-learning/',
      '/changelog/',
      '/other/'
    ];

    if (req.originalUrl === '/') {
      return true;
    }

    let revalidate = false;

    for (var i = 0; i < urls.length; i++) {
      if (req.originalUrl.startsWith(urls[i])) {
        revalidate = true;
      }
    }

    return revalidate;
  },
  logPool: (log) => {
    const key = 'cache-interval-pool';
    const logs = cache.get(key) || [];
    logs.unshift(log);
    if (logs.length > 200) {
        logs.length = 200;
    }
    cache.put(key, logs);
  }
};

module.exports = appHelper;
