import { Feed } from 'src/interfaces/feed.interface';
import { Article } from 'src/interfaces/article.interface';
import { FeedService } from 'src/services/feed.service';
import { RssExtractor } from 'src/integrations/rssExtractor.service';

export const mockFeeds: Feed[] = [
  {
    id: 1,
    websiteName: 'Tech News',
    websiteUrl: 'https://example.com',
    rssUrl: 'https://example.com/rss',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockArticles: Article[] = [
  {
    title: 'Breaking News',
    url: 'https://example.com/breaking-news',
    publishedAt: new Date(),
    description: 'Latest breaking news update.',
    content: 'Full content of breaking news.',
    author: 'John Doe',
    feed: mockFeeds[0],
  },
];

export const mockFeedService = {
  findAll: jest.fn().mockResolvedValue(mockFeeds),
} as unknown as jest.Mocked<FeedService>;

export const mockRssExtractor = {
  fetch: jest.fn().mockResolvedValue(mockArticles),
  createArticlesFromFeed: jest.fn().mockResolvedValue({
    message: 'Articles created from Feed.',
    count: 1,
  }),
} as unknown as jest.Mocked<RssExtractor>;
