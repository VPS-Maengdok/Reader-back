import { ArticleService } from 'src/services/article.service';
import { Feed } from 'src/entities/feed.entity';
import { RssResponse } from 'src/interfaces/tasks/rss.interface';
import { Article as ArticleInterface } from 'src/interfaces/article.interface';

export const mockFeed: Feed = {
  id: 1,
  websiteName: 'Tech News',
  websiteUrl: 'https://example.com',
  rssUrl: 'https://example.com/rss',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockRssResponse: RssResponse = {
  rss: {
    channel: {
      item: [
        {
          title: 'Breaking News',
          link: 'https://example.com/breaking-news',
          pubDate: new Date('Mon, 19 Feb 2025 12:00:00 GMT'),
          description: 'Latest breaking news update.',
          content: 'Full content of breaking news.',
          creator: 'John Doe',
        },
      ],
    },
  },
};

export const expectedArticles: ArticleInterface[] = [
  {
    title: 'Breaking News',
    url: 'https://example.com/breaking-news',
    publishedAt: new Date('Mon, 19 Feb 2025 12:00:00 GMT'),
    description: 'Latest breaking news update.',
    content: 'Full content of breaking news.',
    author: 'John Doe',
    feed: mockFeed,
  },
];

export const mockArticleService = {
  findAll: jest.fn(),
  findAllFromFeed: jest.fn(),
  findOne: jest.fn(),
  add: jest.fn(),
  markAsRead: jest.fn(),
  changeSaveStatus: jest.fn(),
  removeOldArticles: jest.fn(),
} as unknown as jest.Mocked<ArticleService>;
