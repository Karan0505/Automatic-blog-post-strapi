import type { Core } from '@strapi/strapi';

// Strapi bootstrap and permissions initialization
export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    const activeTranslations = new Set<string>();

    const targetModels = new Set([
      'api::post.post',
      'api::category.category',
      'api::author.author',
      'api::tag.tag',
      'api::home-page.home-page',
      'api::about-page.about-page',
      'api::articles-page.articles-page',
      'api::header.header',
      'api::footer.footer',
    ]);

    // Document Service Middleware for Instant Auto-Translation across all locales
    strapi.documents.use(async (context, next) => {
      const result = await next();

      try {
        const action = context.action;
        const uid = context.uid;

        if (!targetModels.has(uid)) {
          return result;
        }

        if (action === 'create' || action === 'publish') {
          const docId = (result as any)?.documentId || (context.params as any)?.documentId;
          const locale = (context.params as any)?.locale || (result as any)?.locale || 'en';

          // Only trigger automatic translation if the source is English (en)
          if (locale === 'en' && docId) {
            const lockKey = `${uid}:${docId}:${action}`;
            if (activeTranslations.has(lockKey)) {
              return result;
            }

            activeTranslations.add(lockKey);

            // Execute in background so the UI doesn't freeze
            setTimeout(async () => {
              try {
                strapi.log.info(`⚡ [Live Auto-Translate] Triggered for ${uid} (${docId}) on ${action}...`);
                await strapi
                  .service('api::translation.translation')
                  ?.autoTranslateToAllLocales({
                    contentType: uid,
                    documentId: docId,
                    sourceLocale: 'en',
                    status: action === 'publish' ? 'published' : 'draft',
                  });
                strapi.log.info(`⚡ [Live Auto-Translate] Completed for ${uid} (${docId})!`);
              } catch (bgErr: any) {
                strapi.log.warn(`⚡ [Live Auto-Translate] Note:`, bgErr.message);
              } finally {
                activeTranslations.delete(lockKey);
              }
            }, 300);
          }
        }
      } catch (err: any) {
        strapi.log.warn('[Auto-Translate Middleware] Context error:', err.message);
      }

      return result;
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      const publicRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'public' } });

      if (publicRole) {
        const apis = ['post', 'category', 'author', 'tag', 'comment', 'home-page', 'about-page', 'articles-page', 'header', 'footer'];
        const actions = ['find', 'findOne'];

        for (const api of apis) {
          for (const action of actions) {
            const actionString = `api::${api}.${api}.${action}`;
            const existing = await strapi
              .query('plugin::users-permissions.permission')
              .findOne({
                where: {
                  role: publicRole.id,
                  action: actionString,
                },
              });

            if (!existing) {
              await strapi.query('plugin::users-permissions.permission').create({
                data: {
                  action: actionString,
                  role: publicRole.id,
                  enabled: true,
                },
              });
            }
          }
        }

        // Enable public read for official i18n locales and translation
        const i18nActions = [
          'plugin::i18n.locales.listLocales',
          'api::translation.translation.translate',
          'api::translation.translation.checkExisting',
          'api::translation.translation.translateFullSite',
          'api::translation.translation.publishAll',
          'api::ai-blog.ai-blog.preview',
          'api::ai-blog.ai-blog.generate',
          'api::ai-blog.ai-blog.status',
          'api::ai-blog.ai-blog.retryTranslation',
        ];
        for (const action of i18nActions) {
          const existing = await strapi
            .query('plugin::users-permissions.permission')
            .findOne({
              where: {
                role: publicRole.id,
                action,
              },
            });
          if (!existing) {
            await strapi.query('plugin::users-permissions.permission').create({
              data: {
                action,
                role: publicRole.id,
                enabled: true,
              },
            });
          }
        }

        strapi.log.info('✅ Automatically enabled Public permissions for Content APIs and i18n Locales!');
      }

      // Initialize Header if empty
      try {
        const existingHeader = await strapi.documents('api::header.header').findFirst({
          populate: ['navLinks'],
        });
        if (!existingHeader) {
          await strapi.documents('api::header.header').create({
            data: {
              siteName: 'CHRONICLE',
              siteSubtitle: 'Tech & Architecture',
              ctaButtonText: 'Explore Stories',
              ctaButtonLink: '/blog',
              navLinks: [
                { label: 'Home', href: '/', isExternal: false },
                { label: 'Articles', href: '/blog', isExternal: false },
                { label: 'About', href: '/about', isExternal: false },
                { label: 'Contact', href: '/contact', isExternal: false },
              ],
            },
          });
          strapi.log.info('✅ Initialized Header Single Type in Strapi!');
        }
      } catch (headerErr) {
        strapi.log.warn('Header init note:', headerErr);
      }

      // Initialize Footer if empty
      try {
        const existingFooter = await strapi.documents('api::footer.footer').findFirst({
          populate: ['column1Links', 'column2Links'],
        });
        if (!existingFooter) {
          await strapi.documents('api::footer.footer').create({
            data: {
              description: 'An independent tech publication exploring high-velocity software engineering, modern headless content management, and avant-garde design systems.',
              column1Title: 'Navigation',
              column1Links: [
                { label: 'Home', href: '/', isExternal: false },
                { label: 'All Articles', href: '/blog', isExternal: false },
                { label: 'About Us', href: '/about', isExternal: false },
                { label: 'Search', href: '/search', isExternal: false },
              ],
              column2Title: 'Discover',
              column2Links: [
                { label: 'All Posts', href: '/blog', isExternal: false },
                { label: 'About Editorial', href: '/about', isExternal: false },
                { label: 'Search Topics', href: '/search', isExternal: false },
              ],
              newsletterTitle: 'Dispatch',
              newsletterDescription: 'Curated articles and engineering blueprints delivered to your inbox every Thursday.',
              newsletterButtonText: 'Subscribe Free',
              copyrightText: 'Chronicle Media Inc. All rights reserved.',
              twitterUrl: 'https://twitter.com',
              githubUrl: 'https://github.com',
              linkedinUrl: 'https://linkedin.com',
            },
          });
          strapi.log.info('✅ Initialized Footer Single Type in Strapi!');
        }
      } catch (footerErr) {
        strapi.log.warn('Footer init note:', footerErr);
      }

      // Initialize Home Page if empty or update with blocks
      try {
        const existingHome = await strapi.documents('api::home-page.home-page').findFirst({
          populate: ['blocks'],
        });

        const defaultBlocks = [
          {
            __component: 'home-blocks.hero',
            badge: 'Featured Editorial',
            heading: 'Architectural Decisions in Modern Web Systems',
            subheading: 'Exploring component-driven design systems, headless content APIs, and extreme front-end performance patterns.',
            buttonText: 'Read Full Story',
            buttonLink: '/blog',
          },
          {
            __component: 'home-blocks.topics-grid',
            title: 'Explore Core Topics',
            subtitle: 'Curated collections across software architecture and engineering',
            viewAllText: 'View All Topics',
            viewAllLink: '/blog',
            limit: 4,
          },
          {
            __component: 'home-blocks.trending-posts',
            title: 'Trending Insights',
            subtitle: 'Most engaging engineering blueprints and architectural patterns',
            limit: 2,
          },
          {
            __component: 'home-blocks.latest-posts',
            title: 'Latest Publications',
            subtitle: 'Freshly released technical essays and development guides',
            browseArchiveText: 'Browse Archive',
            browseArchiveLink: '/blog',
            limit: 6,
          },
          {
            __component: 'shared-blocks.featured-authors',
            title: 'Featured Contributors',
            subtitle: 'Written by seasoned engineers, tech leads, and systems designers',
            limit: 3,
          },
          {
            __component: 'shared-blocks.newsletter-cta',
            badge: 'Join 25,000+ Engineers',
            title: 'Stay ahead of modern full-stack engineering trends',
            description: 'Get weekly architectural blueprints, headless CMS deep dives, and performance tips straight to your inbox. No spam, unsubscribe anytime.',
            buttonText: 'Subscribe Free',
            placeholder: 'Enter your professional email...',
          },
        ];

        const hasValidHomeBlocks = existingHome?.blocks && Array.isArray(existingHome.blocks) && existingHome.blocks.length > 0;

        if (!existingHome) {
          await (strapi.documents('api::home-page.home-page') as any).create({
            data: {
              blocks: defaultBlocks as any,
            },
          });
          strapi.log.info('✅ Initialized Home Page with Dynamic Zone Page Builder in Strapi!');
        } else if (!hasValidHomeBlocks) {
          await (strapi.documents('api::home-page.home-page') as any).update({
            documentId: existingHome.documentId,
            data: {
              blocks: defaultBlocks as any,
            },
          });
          strapi.log.info('✅ Populated Home Page with default home-blocks in Strapi!');
        }

        // Configure Content Manager Edit Layout so 'blocks' is above 'seo'
        try {
          const store = strapi.store({ type: 'plugin', name: 'content_manager' });
          const key = 'configuration_content_types::api::home-page.home-page';
          const currentConfig: any = await store.get({ key });
          if (currentConfig && currentConfig.layouts) {
            currentConfig.layouts.edit = [
              [{ name: 'blocks', size: 12 }],
              [{ name: 'seo', size: 12 }],
            ];
            await store.set({ key, value: currentConfig });
            strapi.log.info('✅ Configured Home Page Content Manager layout: blocks on top, seo below!');
          }
        } catch (layoutErr) {
          strapi.log.warn('Content Manager layout update note:', layoutErr);
        }
      } catch (homeErr) {
        strapi.log.warn('Home page init note:', homeErr);
      }

      // Initialize About Page if empty or update with blocks
      try {
        const existingAbout = await strapi.documents('api::about-page.about-page').findFirst({
          populate: ['blocks'],
        });

        const defaultAboutBlocks = [
          {
            __component: 'about-blocks.about-hero',
            badge: 'Our Mission & Vision',
            title: 'Bridging Software Architecture & Design Craft',
            description: 'Chronicle was founded to elevate technical writing into thoughtful, durable engineering artifacts. We unpack modern headless web architecture, design system engineering, and developer ergonomics.',
            icon: 'Compass',
          },
          {
            __component: 'about-blocks.about-pillars',
            title: 'Core Engineering Principles',
            pillars: [
              {
                icon: 'Zap',
                title: 'Velocity with Quality',
                description: 'We explore architectures that allow small teams to build world-class web experiences without compounding tech debt.',
              },
              {
                icon: 'Terminal',
                title: 'Decoupled Systems',
                description: 'Headless CMS workflows with Strapi and Next.js give marketing and engineering teams complete autonomy.',
              },
              {
                icon: 'Shield',
                title: 'Production Proven',
                description: 'Every pattern and snippet featured in our publications is tested against real-world production constraints.',
              },
            ],
          },
          {
            __component: 'shared-blocks.featured-authors',
            title: 'Editorial Team',
            subtitle: 'Meet the engineers and designers directing our editorial standards.',
            limit: 6,
          },
          {
            __component: 'about-blocks.about-pitch',
            icon: 'Mail',
            title: 'Have a story or case study to share?',
            description: 'We welcome guest authors and engineering teams building high-impact web products. Submit your pitch to our editorial desk.',
            buttonText: 'Submit Editorial Pitch',
            buttonLink: 'mailto:editor@chronicle.dev',
          },
        ];

        const hasValidAboutBlocks = existingAbout?.blocks && Array.isArray(existingAbout.blocks) && existingAbout.blocks.length > 0;

        if (!existingAbout) {
          await (strapi.documents('api::about-page.about-page') as any).create({
            data: {
              blocks: defaultAboutBlocks as any,
            },
          });
          strapi.log.info('✅ Initialized About Page with Dynamic Zone Page Builder in Strapi!');
        } else if (!hasValidAboutBlocks) {
          await (strapi.documents('api::about-page.about-page') as any).update({
            documentId: existingAbout.documentId,
            data: {
              blocks: defaultAboutBlocks as any,
            },
          });
          strapi.log.info('✅ Populated About Page with default about-blocks in Strapi!');
        }

        // Configure Content Manager Edit Layout for About Page so 'blocks' is above 'seo'
        try {
          const store = strapi.store({ type: 'plugin', name: 'content_manager' });
          const key = 'configuration_content_types::api::about-page.about-page';
          const currentConfig: any = await store.get({ key });
          if (currentConfig && currentConfig.layouts) {
            currentConfig.layouts.edit = [
              [{ name: 'blocks', size: 12 }],
              [{ name: 'seo', size: 12 }],
            ];
            await store.set({ key, value: currentConfig });
            strapi.log.info('✅ Configured About Page Content Manager layout: blocks on top, seo below!');
          }
        } catch (layoutErr) {
          strapi.log.warn('About Page Content Manager layout update note:', layoutErr);
        }
      } catch (aboutErr) {
        strapi.log.warn('About page init note:', aboutErr);
      }

      // Initialize Articles Page if empty
      try {
        const existingArticles = await strapi.documents('api::articles-page.articles-page').findFirst({
          populate: ['blocks'],
        });

        const defaultArticlesBlocks = [
          {
            __component: 'articles-blocks.articles-header',
            badge: 'Publication Archive',
            title: 'Articles & Insights',
            description: 'In-depth perspectives, architectural case studies, and engineering tutorials authored by practitioners.',
            icon: 'BookOpen',
          },
          {
            __component: 'articles-blocks.articles-grid',
            showCategoryFilter: true,
            showTagFilter: true,
            pageSize: 6,
            columns: 3,
          },
          {
            __component: 'shared-blocks.newsletter-cta',
            badge: 'Join 25,000+ Engineers',
            title: 'Stay ahead of modern full-stack engineering trends',
            description: 'Get weekly architectural blueprints, headless CMS deep dives, and performance tips straight to your inbox.',
            buttonText: 'Subscribe Free',
            placeholder: 'Enter your professional email...',
          },
        ];

        const hasValidArticlesBlocks = existingArticles?.blocks && Array.isArray(existingArticles.blocks) && existingArticles.blocks.length > 0;

        if (!existingArticles) {
          await (strapi.documents('api::articles-page.articles-page') as any).create({
            data: {
              blocks: defaultArticlesBlocks as any,
            },
          });
          strapi.log.info('✅ Initialized Articles Page with Dynamic Zone Page Builder in Strapi!');
        } else if (!hasValidArticlesBlocks) {
          await (strapi.documents('api::articles-page.articles-page') as any).update({
            documentId: existingArticles.documentId,
            data: {
              blocks: defaultArticlesBlocks as any,
            },
          });
          strapi.log.info('✅ Populated Articles Page with default articles-blocks in Strapi!');
        }

        // Configure Content Manager Edit Layout for Articles Page so 'blocks' is above 'seo'
        try {
          const store = strapi.store({ type: 'plugin', name: 'content_manager' });
          const key = 'configuration_content_types::api::articles-page.articles-page';
          const currentConfig: any = await store.get({ key });
          if (currentConfig && currentConfig.layouts) {
            currentConfig.layouts.edit = [
              [{ name: 'blocks', size: 12 }],
              [{ name: 'seo', size: 12 }],
            ];
            await store.set({ key, value: currentConfig });
            strapi.log.info('✅ Configured Articles Page Content Manager layout: blocks on top, seo below!');
          }
        } catch (layoutErr) {
          strapi.log.warn('Articles Page Content Manager layout update note:', layoutErr);
        }
      } catch (articlesErr) {
        strapi.log.warn('Articles page init note:', articlesErr);
      }

      // Seed Categories if empty
      let catArchitecture: any;
      let catHeadless: any;
      let catDesign: any;
      let catPerf: any;

      try {
        const existingCats = await (strapi.documents('api::category.category') as any).findMany();
        if (!existingCats || existingCats.length === 0) {
          catArchitecture = await (strapi.documents('api::category.category') as any).create({
            data: {
              name: 'Software Architecture',
              slug: 'software-architecture',
              description: 'Patterns, distributed systems, and modern architectural principles.',
              color: '#3b82f6',
            },
          });
          await (strapi.documents('api::category.category') as any).publish({ documentId: catArchitecture.documentId });

          catHeadless = await (strapi.documents('api::category.category') as any).create({
            data: {
              name: 'Headless CMS',
              slug: 'headless-cms',
              description: 'Decoupled content architecture, APIs, and modern publishing workflows.',
              color: '#6366f1',
            },
          });
          await (strapi.documents('api::category.category') as any).publish({ documentId: catHeadless.documentId });

          catDesign = await (strapi.documents('api::category.category') as any).create({
            data: {
              name: 'Design Systems',
              slug: 'design-systems',
              description: 'Component architecture, micro-interactions, and resilient tokens.',
              color: '#ec4899',
            },
          });
          await (strapi.documents('api::category.category') as any).publish({ documentId: catDesign.documentId });

          catPerf = await (strapi.documents('api::category.category') as any).create({
            data: {
              name: 'Performance',
              slug: 'performance',
              description: 'Core Web Vitals, server-side caching, and sub-millisecond edge rendering.',
              color: '#10b981',
            },
          });
          await (strapi.documents('api::category.category') as any).publish({ documentId: catPerf.documentId });

          strapi.log.info('✅ Seeded 4 initial Categories in Strapi!');
        } else {
          catArchitecture = existingCats[0];
          catHeadless = existingCats[1] || existingCats[0];
          catDesign = existingCats[2] || existingCats[0];
        }
      } catch (catErr) {
        strapi.log.warn('Category seed note:', catErr);
      }

      // Seed Authors if empty
      let authorAlex: any;
      let authorElena: any;

      try {
        const existingAuthors = await (strapi.documents('api::author.author') as any).findMany();
        if (!existingAuthors || existingAuthors.length === 0) {
          authorAlex = await (strapi.documents('api::author.author') as any).create({
            data: {
              name: 'Alex Vance',
              slug: 'alex-vance',
              role: 'Lead Systems Architect',
              email: 'alex.vance@chronicle.dev',
              bio: 'Specializing in high-throughput cloud architectures, decoupled headless APIs, and edge performance.',
            },
          });

          authorElena = await (strapi.documents('api::author.author') as any).create({
            data: {
              name: 'Elena Rostova',
              slug: 'elena-rostova',
              role: 'Principal Design Engineer',
              email: 'elena.rostova@chronicle.dev',
              bio: 'Pioneering accessible component systems, micro-interactions, and design tokens.',
            },
          });

          strapi.log.info('✅ Seeded 2 initial Authors in Strapi!');
        } else {
          authorAlex = existingAuthors[0];
          authorElena = existingAuthors[1] || existingAuthors[0];
        }
      } catch (authorErr) {
        strapi.log.warn('Author seed note:', authorErr);
      }

      // Seed Posts if empty
      try {
        const existingPosts = await (strapi.documents('api::post.post') as any).findMany();
        if (!existingPosts || existingPosts.length === 0) {
          const post1 = await (strapi.documents('api::post.post') as any).create({
            data: {
              title: 'Architectural Decisions in Modern Web Systems',
              slug: 'architectural-decisions-in-modern-web-systems',
              excerpt: 'Exploring component-driven design systems, headless content APIs, and extreme front-end performance patterns.',
              content: '### Architectural Decisions in Modern Web Systems\n\nWhen scaling modern web platforms, selecting the right architecture is paramount. Decoupling the frontend presentation layer from backend content storage provides engineering teams unmatched velocity.\n\n#### Key Takeaways\n1. **Edge Caching**: Utilizing Next.js on the edge reduces latency.\n2. **Type-Safe Content**: Strapi provides clear typed document schemas.\n3. **Component Reusability**: Design system primitives prevent duplication.',
              readingTime: 6,
              featured: true,
              trending: true,
              workflowStatus: 'approved',
              moderationStatus: 'approved',
              category: catArchitecture?.documentId ? { set: [catArchitecture.documentId] } : undefined,
              author: authorAlex?.documentId ? { set: [authorAlex.documentId] } : undefined,
            },
          });
          await (strapi.documents('api::post.post') as any).publish({ documentId: post1.documentId });

          const post2 = await (strapi.documents('api::post.post') as any).create({
            data: {
              title: 'Mastering Headless Content Workflows with Strapi 5 and Next.js',
              slug: 'mastering-headless-content-workflows-with-strapi-5-and-nextjs',
              excerpt: 'How leading engineering teams streamline editorial publishing with dynamic zones and localized schemas.',
              content: '### Mastering Headless Content Workflows\n\nHeadless content management allows editors and developers to collaborate without blocking each other. Dynamic Zones in Strapi empower marketers to build modular landing pages without code deployments.\n\n#### Workflow Advantages\n- Instant internationalization (i18n) across global languages.\n- Real-time previews with ISR and on-demand cache revalidation.\n- Production reliability with PostgreSQL backends.',
              readingTime: 5,
              featured: false,
              trending: true,
              workflowStatus: 'approved',
              moderationStatus: 'approved',
              category: catHeadless?.documentId ? { set: [catHeadless.documentId] } : undefined,
              author: authorAlex?.documentId ? { set: [authorAlex.documentId] } : undefined,
            },
          });
          await (strapi.documents('api::post.post') as any).publish({ documentId: post2.documentId });

          const post3 = await (strapi.documents('api::post.post') as any).create({
            data: {
              title: 'Design Systems at Scale: Building Resilient Micro-Interactions',
              slug: 'design-systems-at-scale-building-resilient-micro-interactions',
              excerpt: 'Creating memorable digital products with fluid motion, accessible contrast, and token-based palettes.',
              content: '### Design Systems at Scale\n\nA great design system is more than just a component library; it is a shared language between design and engineering. By utilizing token-driven themes, teams maintain brand consistency across applications.\n\n#### Core Pillars\n- Accessible color contrast ratios compliant with WCAG 2.1.\n- Micro-animations that inform without distracting.\n- Modular CSS structures.',
              readingTime: 4,
              featured: false,
              trending: false,
              workflowStatus: 'approved',
              moderationStatus: 'approved',
              category: catDesign?.documentId ? { set: [catDesign.documentId] } : undefined,
              author: authorElena?.documentId ? { set: [authorElena.documentId] } : undefined,
            },
          });
          await (strapi.documents('api::post.post') as any).publish({ documentId: post3.documentId });

          strapi.log.info('✅ Seeded 3 initial published Posts in Strapi!');
        }
      } catch (postErr) {
        strapi.log.warn('Post seed note:', postErr);
      }
    } catch (err) {
      strapi.log.warn('Could not auto-grant public permissions:', err);
    }
  },
};
