export default {
  routes: [
    {
      method: 'POST',
      path: '/ai-blog/preview',
      handler: 'api::ai-blog.ai-blog.preview',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/ai-blog/generate',
      handler: 'api::ai-blog.ai-blog.generate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/ai-blog/publish',
      handler: 'api::ai-blog.ai-blog.publish',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/ai-blog/status',
      handler: 'api::ai-blog.ai-blog.status',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/ai-blog/categories',
      handler: 'api::ai-blog.ai-blog.categories',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/ai-blog/check-duplicate',
      handler: 'api::ai-blog.ai-blog.checkDuplicate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/ai-blog/retry-translation',
      handler: 'api::ai-blog.ai-blog.retryTranslation',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/ai-blog/backfill-covers',
      handler: 'api::ai-blog.ai-blog.backfillCovers',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

