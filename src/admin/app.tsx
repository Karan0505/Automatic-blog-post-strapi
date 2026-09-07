import type { StrapiApp } from '@strapi/strapi/admin';
import { Panel } from './components/TranslatePanel';

export default {
  config: {
    locales: [],
  },
  register(app: StrapiApp) {
    try {
      const contentManager = app.getPlugin('content-manager');
      if (contentManager && (contentManager as any).apis?.addEditViewSidePanel) {
        (contentManager as any).apis.addEditViewSidePanel([Panel]);
      }
    } catch (err) {
      console.warn('Could not register translation panel in register:', err);
    }
  },
  bootstrap(app: StrapiApp) {},
};
