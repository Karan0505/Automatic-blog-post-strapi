import type { Schema, Struct } from '@strapi/strapi';

export interface AboutBlocksAboutHero extends Struct.ComponentSchema {
  collectionName: 'components_about_blocks_about_heroes';
  info: {
    description: 'About page mission and headline spotlight';
    displayName: 'About Hero';
    icon: 'compass';
  };
  attributes: {
    badge: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Our Mission & Vision'>;
    description: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Chronicle was founded to elevate technical writing into thoughtful, durable engineering artifacts. We unpack modern headless web architecture, design system engineering, and developer ergonomics.'>;
    icon: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Compass'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Bridging Software Architecture & Design Craft'>;
  };
}

export interface AboutBlocksAboutPillars extends Struct.ComponentSchema {
  collectionName: 'components_about_blocks_about_pillars';
  info: {
    description: 'About page core pillars with repeatable feature cards';
    displayName: 'Core Pillars';
    icon: 'shield';
  };
  attributes: {
    pillars: Schema.Attribute.Component<
      'shared-blocks.feature-card-item',
      true
    >;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Core Engineering Principles'>;
  };
}

export interface AboutBlocksAboutPitch extends Struct.ComponentSchema {
  collectionName: 'components_about_blocks_about_pitches';
  info: {
    description: 'About page guest author submissions and pitch callout';
    displayName: 'Editorial Pitch';
    icon: 'envelope';
  };
  attributes: {
    buttonLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'mailto:editor@chronicle.dev'>;
    buttonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Submit Editorial Pitch'>;
    description: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'We welcome guest authors and engineering teams building high-impact web products. Submit your pitch to our editorial desk.'>;
    icon: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Mail'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Have a story or case study to share?'>;
  };
}

export interface ArticlesBlocksArticlesGrid extends Struct.ComponentSchema {
  collectionName: 'components_articles_blocks_articles_grids';
  info: {
    description: 'Article cards feed with category filter, tag filter, and pagination';
    displayName: 'Articles Feed Grid';
    icon: 'grid';
  };
  attributes: {
    columns: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<3>;
    pageSize: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<6>;
    showCategoryFilter: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    showTagFilter: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface ArticlesBlocksArticlesHeader extends Struct.ComponentSchema {
  collectionName: 'components_articles_blocks_articles_headers';
  info: {
    description: 'Publication archive header banner';
    displayName: 'Articles Header';
    icon: 'book';
  };
  attributes: {
    badge: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Publication Archive'>;
    description: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'In-depth perspectives, architectural case studies, and engineering tutorials authored by practitioners.'>;
    icon: Schema.Attribute.String & Schema.Attribute.DefaultTo<'BookOpen'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Articles & Insights'>;
  };
}

export interface BlogSocialLinks extends Struct.ComponentSchema {
  collectionName: 'components_blog_social_links';
  info: {
    description: 'Author or blog social links';
    displayName: 'Social Link';
    icon: 'link';
  };
  attributes: {
    platform: Schema.Attribute.Enumeration<
      ['twitter', 'github', 'linkedin', 'youtube', 'website', 'instagram']
    > &
      Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface BlogTableOfContents extends Struct.ComponentSchema {
  collectionName: 'components_blog_table_of_contents';
  info: {
    description: 'Table of contents entry';
    displayName: 'Table of Contents Item';
    icon: 'bulletList';
  };
  attributes: {
    anchor: Schema.Attribute.String & Schema.Attribute.Required;
    level: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<2>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomeBlocksHero extends Struct.ComponentSchema {
  collectionName: 'components_home_blocks_heroes';
  info: {
    description: 'Featured story and hero banner for Home page';
    displayName: 'Home Hero';
    icon: 'sparkles';
  };
  attributes: {
    badge: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Featured Editorial'>;
    buttonLink: Schema.Attribute.String & Schema.Attribute.DefaultTo<'/blog'>;
    buttonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Explore Publications'>;
    heading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Architectural Decisions in Modern Web Systems'>;
    subheading: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Deep dives into modern frontend ergonomics, headless CMS architectures, and high-performance design patterns.'>;
  };
}

export interface HomeBlocksLatestPosts extends Struct.ComponentSchema {
  collectionName: 'components_home_blocks_latest_posts';
  info: {
    description: 'Latest publications feed grid';
    displayName: 'Latest Posts';
    icon: 'newspaper';
  };
  attributes: {
    browseArchiveLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/blog'>;
    browseArchiveText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Browse Archive'>;
    limit: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<6>;
    subtitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Freshly released technical essays and development guides'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Latest Publications'>;
  };
}

export interface HomeBlocksTopicsGrid extends Struct.ComponentSchema {
  collectionName: 'components_home_blocks_topics_grids';
  info: {
    description: 'Category cards grid for topics exploration';
    displayName: 'Topics Grid';
    icon: 'layer-group';
  };
  attributes: {
    limit: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<4>;
    subtitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Curated collections across software architecture and engineering'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Explore Core Topics'>;
    viewAllLink: Schema.Attribute.String & Schema.Attribute.DefaultTo<'/blog'>;
    viewAllText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'View All Topics'>;
  };
}

export interface HomeBlocksTrendingPosts extends Struct.ComponentSchema {
  collectionName: 'components_home_blocks_trending_posts';
  info: {
    description: 'Trending posts showcase grid';
    displayName: 'Trending Posts';
    icon: 'bolt';
  };
  attributes: {
    limit: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<2>;
    subtitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Most engaging engineering blueprints and architectural patterns'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Trending Insights'>;
  };
}

export interface LayoutNavLink extends Struct.ComponentSchema {
  collectionName: 'components_layout_nav_links';
  info: {
    description: 'Header navigation link items';
    displayName: 'Navigation Link';
    icon: 'link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedBlocksCtaBanner extends Struct.ComponentSchema {
  collectionName: 'components_shared_blocks_cta_banners';
  info: {
    description: 'Call to action announcement banner';
    displayName: 'CTA Banner';
    icon: 'bullhorn';
  };
  attributes: {
    badge: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    primaryButtonLink: Schema.Attribute.String;
    primaryButtonText: Schema.Attribute.String;
    secondaryButtonLink: Schema.Attribute.String;
    secondaryButtonText: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedBlocksFeatureCardItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_blocks_feature_card_items';
  info: {
    description: 'Individual feature card';
    displayName: 'Feature Card Item';
    icon: 'star';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    icon: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Zap'>;
    link: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedBlocksFeatureCards extends Struct.ComponentSchema {
  collectionName: 'components_shared_blocks_feature_cards';
  info: {
    description: 'Grid of highlighted feature cards';
    displayName: 'Feature Cards Grid';
    icon: 'grid';
  };
  attributes: {
    cards: Schema.Attribute.Component<'shared-blocks.feature-card-item', true>;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SharedBlocksFeaturedAuthors extends Struct.ComponentSchema {
  collectionName: 'components_shared_blocks_featured_authors';
  info: {
    description: 'Featured editorial team showcase';
    displayName: 'Featured Authors';
    icon: 'users';
  };
  attributes: {
    limit: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<3>;
    subtitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Written by seasoned engineers, tech leads, and systems designers'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Featured Contributors'>;
  };
}

export interface SharedBlocksNewsletterCta extends Struct.ComponentSchema {
  collectionName: 'components_shared_blocks_newsletter_ctas';
  info: {
    description: 'Newsletter subscription form banner';
    displayName: 'Newsletter CTA';
    icon: 'mail';
  };
  attributes: {
    badge: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Join 25,000+ Engineers'>;
    buttonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Subscribe Free'>;
    description: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Get weekly architectural blueprints, headless CMS deep dives, and performance tips straight to your inbox.'>;
    placeholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter your professional email...'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Stay ahead of modern full-stack engineering trends'>;
  };
}

export interface SharedBlocksRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_blocks_rich_texts';
  info: {
    description: 'Markdown and rich formatted text block';
    displayName: 'Rich Text';
    icon: 'align-left';
  };
  attributes: {
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'Search Engine Optimization metadata';
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    canonicalURL: Schema.Attribute.String;
    keywords: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    preventIndexing: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'about-blocks.about-hero': AboutBlocksAboutHero;
      'about-blocks.about-pillars': AboutBlocksAboutPillars;
      'about-blocks.about-pitch': AboutBlocksAboutPitch;
      'articles-blocks.articles-grid': ArticlesBlocksArticlesGrid;
      'articles-blocks.articles-header': ArticlesBlocksArticlesHeader;
      'blog.social-links': BlogSocialLinks;
      'blog.table-of-contents': BlogTableOfContents;
      'home-blocks.hero': HomeBlocksHero;
      'home-blocks.latest-posts': HomeBlocksLatestPosts;
      'home-blocks.topics-grid': HomeBlocksTopicsGrid;
      'home-blocks.trending-posts': HomeBlocksTrendingPosts;
      'layout.nav-link': LayoutNavLink;
      'shared-blocks.cta-banner': SharedBlocksCtaBanner;
      'shared-blocks.feature-card-item': SharedBlocksFeatureCardItem;
      'shared-blocks.feature-cards': SharedBlocksFeatureCards;
      'shared-blocks.featured-authors': SharedBlocksFeaturedAuthors;
      'shared-blocks.newsletter-cta': SharedBlocksNewsletterCta;
      'shared-blocks.rich-text': SharedBlocksRichText;
      'shared.seo': SharedSeo;
    }
  }
}
