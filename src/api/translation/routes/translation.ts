export default {
  routes: [
    {
      method: 'POST',
      path: '/translation/translate',
      handler: 'api::translation.translation.translate',
      config: {
        auth: false, // Protected via Users-Permissions or Admin auth
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/translation/check-existing',
      handler: 'api::translation.translation.checkExisting',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/translation/translate-full-site',
      handler: 'api::translation.translation.translateFullSite',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/translation/publish-all',
      handler: 'api::translation.translation.publishAll',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
