import { Test, TestingModule } from '@nestjs/testing';
import { RssTask } from 'src/tasks/rss.task';
import { FeedService } from 'src/services/feed.service';
import { RssExtractor } from 'src/integrations/rssExtractor.service';
import { Logger } from '@nestjs/common';
import {
  mockFeedService,
  mockRssExtractor,
  mockArticles,
  mockFeeds,
} from './mocks/rss.task.mock';

describe('RssTask', () => {
  let rssTask: RssTask;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RssTask,
        { provide: FeedService, useValue: mockFeedService },
        { provide: RssExtractor, useValue: mockRssExtractor },
      ],
    }).compile();

    rssTask = module.get<RssTask>(RssTask);
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(rssTask).toBeDefined();
  });

  describe('fetchFeedsFromDatabase', () => {
    it('should fetch feeds and process articles', async () => {
      const result = await rssTask.fetchFeedsFromDatabase();

      expect(jest.spyOn(mockFeedService, 'findAll')).toHaveBeenCalledTimes(1);
      expect(jest.spyOn(mockRssExtractor, 'fetch')).toHaveBeenCalledTimes(
        mockFeeds.length,
      );
      expect(
        jest.spyOn(mockRssExtractor, 'createArticlesFromFeed'),
      ).toHaveBeenCalledTimes(mockFeeds.length);
      expect(loggerSpy).toHaveBeenCalledWith(
        '🕒 Running Cron Job: Fetching feeds from the database...',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `${mockFeeds.length} RSS Feeds have been found.`,
      );
      expect(loggerSpy).toHaveBeenCalledWith('✅ Cron job completed.');
      expect(result).toBe(1);
    });

    it('should log error if fetching feeds fails', async () => {
      jest
        .spyOn(mockFeedService, 'findAll')
        .mockRejectedValue(new Error('Database error'));

      await expect(rssTask.fetchFeedsFromDatabase()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('extractFeed', () => {
    it('should extract articles from a feed', async () => {
      await rssTask['extractFeed'](mockFeeds[0]);

      expect(jest.spyOn(mockRssExtractor, 'fetch')).toHaveBeenCalledWith(
        mockFeeds[0],
      );
      expect(
        jest.spyOn(mockRssExtractor, 'createArticlesFromFeed'),
      ).toHaveBeenCalledWith(mockArticles);
      expect(loggerSpy).toHaveBeenCalledWith(
        `Extracting article from ${mockFeeds[0].websiteName} RSS`,
      );
    });
  });

  describe('createArticlesFromExtraction', () => {
    it('should process extracted articles', async () => {
      await rssTask['createArticlesFromExtraction'](mockArticles, mockFeeds[0]);

      expect(
        jest.spyOn(mockRssExtractor, 'createArticlesFromFeed'),
      ).toHaveBeenCalledWith(mockArticles);
      expect(loggerSpy).toHaveBeenCalledWith(
        `Creating new articles from the ${mockArticles.length} extracted in ${mockFeeds[0].websiteName}.`,
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        '1 new articles have been created.',
      );
    });
  });
});
