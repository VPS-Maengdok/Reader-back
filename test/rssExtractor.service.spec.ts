import { RssExtractor } from 'src/integrations/rssExtractor.service';
import { InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { Article } from 'src/interfaces/article.interface';
import { Feed } from 'src/entities/feed.entity';
import { ArticleService } from 'src/services/article.service';

jest.mock('axios');

describe('RssExtractor', () => {
  let rssExtractor: RssExtractor;
  let mockArticleService: Partial<ArticleService>;

  const mockFeed: Feed = {
    id: 1,
    websiteName: 'Tech News',
    websiteUrl: 'https://example.com',
    rssUrl: 'https://example.com/rss',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const expectedArticles: Article[] = [
    {
      title: 'Breaking News',
      url: 'https://example.com/breaking-news',
      publishedAt: new Date('2025-02-19T12:00:00Z'),
      description: 'Latest breaking news update.',
      content: 'Full content of breaking news.',
      author: 'John Doe',
      feed: mockFeed,
    },
  ];

  const fakeParsedData = {
    rss: {
      channel: {
        item: [
          {
            title: 'Breaking News',
            link: 'https://example.com/breaking-news',
            pubDate: '2025-02-19T12:00:00Z',
            description: 'Latest breaking news update.',
            content: 'Full content of breaking news.',
            creator: 'John Doe',
          },
        ],
      },
    },
  };

  beforeEach(() => {
    mockArticleService = {
      add: jest.fn(),
    };
    rssExtractor = new RssExtractor(mockArticleService as ArticleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetch', () => {
    it('should fetch and parse RSS feed successfully', async () => {
      jest
        .spyOn(rssExtractor['parserInstance'], 'parse')
        .mockReturnValue(fakeParsedData);

      (axios.get as jest.Mock).mockResolvedValue({ data: 'dummy data' });

      const articles = await rssExtractor.fetch(mockFeed);

      expect(articles).toMatchObject(expectedArticles);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(axios.get).toHaveBeenCalledWith(mockFeed.rssUrl);
    });

    it('should throw InternalServerErrorException on fetch failure', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));
      await expect(rssExtractor.fetch(mockFeed)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should return an empty array when RSS feed has no items', async () => {
      const emptyParsedData = { rss: { channel: { item: [] } } };
      jest
        .spyOn(rssExtractor['parserInstance'], 'parse')
        .mockReturnValue(emptyParsedData);
      (axios.get as jest.Mock).mockResolvedValue({ data: 'dummy data' });

      const articles = await rssExtractor.fetch(mockFeed);

      expect(articles).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(axios.get).toHaveBeenCalledWith(mockFeed.rssUrl);
    });
  });

  describe('createArticlesFromFeed', () => {
    it('should create articles and return success message', async () => {
      (mockArticleService.add as jest.Mock).mockResolvedValue({
        message: 'Article has been successfully created.',
        created: true,
      });
      const result =
        await rssExtractor.createArticlesFromFeed(expectedArticles);

      expect(result).toEqual({
        message: 'Articles created from Feed.',
        count: 1,
      });
      expect(mockArticleService.add).toHaveBeenCalledTimes(
        expectedArticles.length,
      );
    });

    it('should count only newly created articles', async () => {
      (mockArticleService.add as jest.Mock).mockResolvedValue({
        message: 'Article already exists.',
        created: false,
      });
      const result =
        await rssExtractor.createArticlesFromFeed(expectedArticles);

      expect(result).toEqual({
        message: 'Articles created from Feed.',
        count: 0,
      });
    });
  });
});
