import { RssExtractor } from 'src/integrations/rssExtractor.service';
import { InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { RssItem } from 'src/interfaces/tasks/rss.interface';
import {
  mockArticleService,
  mockFeed,
  mockRssResponse,
  expectedArticles,
} from './mocks/rssExtractor.service.mock';

jest.mock('axios');

describe('RssExtractor', () => {
  let rssExtractor: RssExtractor;

  beforeEach(() => {
    rssExtractor = new RssExtractor(mockArticleService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetch', () => {
    it('should fetch and parse RSS feed successfully', async () => {
      jest
        .spyOn(rssExtractor as any, 'extractItems')
        .mockReturnValue(mockRssResponse.rss?.channel?.item ?? []);
      (axios.get as jest.Mock).mockResolvedValue({ data: mockRssResponse });

      const articles = await rssExtractor.fetch(mockFeed);

      expect(articles).toMatchObject(expectedArticles);
      expect(jest.spyOn(axios, 'get')).toHaveBeenCalledWith(mockFeed.rssUrl);
    });

    it('should throw InternalServerErrorException on fetch failure', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(rssExtractor.fetch(mockFeed)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should return an empty array when RSS feed has no items', async () => {
      jest.spyOn(rssExtractor as any, 'extractItems').mockReturnValue([]);
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      const articles = await rssExtractor.fetch(mockFeed);

      expect(articles).toEqual([]);
      expect(jest.spyOn(axios, 'get')).toHaveBeenCalledWith(mockFeed.rssUrl);
    });
  });

  describe('createArticlesFromFeed', () => {
    it('should create articles and return success message', async () => {
      jest.spyOn(mockArticleService, 'add').mockResolvedValueOnce({
        message: 'Article has been successfully created.',
        created: true,
      });

      const result =
        await rssExtractor.createArticlesFromFeed(expectedArticles);

      expect(result).toEqual({
        message: 'Articles created from Feed.',
        count: 1,
      });
      expect(jest.spyOn(mockArticleService, 'add')).toHaveBeenCalledTimes(1);
    });

    it('should count only newly created articles', async () => {
      jest.spyOn(mockArticleService, 'add').mockResolvedValueOnce({
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

  describe('Helper methods', () => {
    const mockRssItem: RssItem = {
      title: 'Sample Article',
      link: 'https://example.com/sample',
      pubDate: new Date('2025-02-19T12:00:00Z'),
      description: 'Sample description',
      content: 'Sample content',
      creator: 'Jane Doe',
    };

    it('extractDate should return pubDate if available', () => {
      expect(rssExtractor['extractDate'](mockRssItem)).toEqual(
        new Date(mockRssItem.pubDate ?? '1970-01-01T00:00:00Z'),
      );
    });

    it('extractDate should return current date if pubDate and dc:date are missing', () => {
      const result = rssExtractor['extractDate']({} as unknown as RssItem);
      expect(result).toBeInstanceOf(Date);
    });

    it('extractDate should return dc:date if available', () => {
      expect(
        rssExtractor['extractDate']({
          'dc:date': '2025-02-19T12:00:00Z',
        } as unknown as RssItem),
      ).toEqual(new Date('2025-02-19T12:00:00Z'));
    });

    it('extractCreator should return creator if available', () => {
      expect(rssExtractor['extractCreator'](mockRssItem)).toBe('Jane Doe');
    });

    it('extractCreator should return an empty string if creator is missing', () => {
      expect(rssExtractor['extractCreator']({} as unknown as RssItem)).toBe('');
    });

    it('extractContent should return content if available', () => {
      expect(rssExtractor['extractContent'](mockRssItem)).toBe(
        'Sample content',
      );
    });

    it('extractContent should return an empty string if content and content:encoded are missing', () => {
      expect(rssExtractor['extractContent']({} as unknown as RssItem)).toBe('');
    });

    it('extractLink should return link if available', () => {
      expect(rssExtractor['extractLink'](mockRssItem)).toBe(
        'https://example.com/sample',
      );
    });

    it('extractItems should return parsed items correctly', () => {
      expect(rssExtractor['extractItems'](mockRssResponse)).toEqual(
        mockRssResponse.rss?.channel?.item,
      );
    });
  });
});
