// Types for BBC-style homepage API responses

export interface HomePostPreview {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  publishedAt: string | Date;
  readingTime: number;
  featured: boolean;
  author: {
    name: string;
    avatar?: string | null;
  };
  category: {
    name: string;
    slug: string;
  } | null;
  image: string | null;
}

export interface HomepageData {
  hero: {
    main: HomePostPreview | null;
    side: HomePostPreview[];
  };
  topStories: HomePostPreview[];
  moreNews: HomePostPreview[];
  mustRead: HomePostPreview[];
  feature: {
    main: HomePostPreview | null;
    side: HomePostPreview | null;
  };
  video: HomePostPreview | null;
  bottomGrid: HomePostPreview[];
}

export interface CategoryWithPosts {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
  posts?: HomePostPreview[];
}
