import { Test, TestingModule } from '@nestjs/testing';
import { FeedController } from 'src/controllers/feed.controller';
import { FeedService } from 'src/services/feed.service';
import { RssTask } from 'src/tasks/rss.task';
import { NotFoundException } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import {
  mockFeeds,
  mockFeedCreate,
  mockFeedUpdate,
  mockFeedService,
  mockRssTask,
} from './mocks/feed.mock';
import { ArticleService } from 'src/services/article.service';
import { mockArticleService } from './mocks/article.mock';

describe('FeedController', () => {
  let feedController: FeedController;
  let feedService: FeedService;
  let rssTask: RssTask;
  let articleService: ArticleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        { provide: FeedService, useValue: mockFeedService },
        { provide: RssTask, useValue: mockRssTask },
        { provide: ArticleService, useValue: mockArticleService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) }) // Mock AuthGuard to allow access
      .compile();

    feedController = module.get<FeedController>(FeedController);
    feedService = module.get<FeedService>(FeedService);
    articleService = module.get<ArticleService>(ArticleService);
    rssTask = module.get<RssTask>(RssTask);
  });

  it('should be defined', () => {
    expect(feedController).toBeDefined();
    expect(feedService).toBeDefined();
    expect(articleService).toBeDefined();
    expect(rssTask).toBeDefined();
  });

  describe('GET /feed', () => {
    it('should return an array of feeds', async () => {
      const result = await feedController.getFeeds();
      expect(result).toEqual(mockFeeds);
      expect(mockFeedService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /feed?isActivate=true', () => {
    it('should return an array of feeds', async () => {
      const result = await feedController.getFeeds('true');
      expect(result).toEqual(mockFeeds);
      expect(mockFeedService.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('GET /feed?isActivate=false', () => {
    it('should return an empty array of feeds', async () => {
      const result = await feedController.getFeeds('false');
      expect(result).toEqual([]);
      expect(mockFeedService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('GET /feed/:id', () => {
    it('should return a feed when found', async () => {
      const result = await feedController.getFeed(1);
      expect(result).toEqual(mockFeeds[0]);
      expect(mockFeedService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when feed is not found', async () => {
      await expect(feedController.getFeed(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('POST /feed/add', () => {
    it('should add a new feed', async () => {
      const result = await feedController.addFeed(mockFeedCreate);
      expect(result).toEqual({
        message: 'Feed has been successfully created.',
      });
      expect(mockFeedService.add).toHaveBeenCalledWith(mockFeedCreate);
    });
  });

  describe('PATCH /feed/update', () => {
    it('should update an existing feed', async () => {
      const result = await feedController.updateFeed(mockFeedUpdate);
      expect(result).toEqual({
        message: 'Feed has been successfully updated.',
      });
      expect(mockFeedService.update).toHaveBeenCalledWith(mockFeedUpdate);
    });
  });

  describe('PUT /feed/activate/:id', () => {
    it('should deactivate a feed', async () => {
      mockFeedService.findOne = jest.fn().mockResolvedValue({
        ...mockFeeds[0],
        isActivate: true,
      });

      mockFeedService.activate = jest.fn().mockResolvedValue({
        message: 'Feed has been successfully deactivated.',
      });

      const result = await feedController.activateFeed(1);
      expect(result).toEqual({
        message: 'Feed has been successfully deactivated.',
      });
      expect(mockFeedService.activate).toHaveBeenCalledWith(1);
    });
  });

  describe('PUT /feed/activate/:id', () => {
    it('should activate a feed', async () => {
      mockFeedService.findOne = jest.fn().mockResolvedValue({
        ...mockFeeds[0],
        isActivate: false,
      });

      mockFeedService.activate = jest.fn().mockResolvedValue({
        message: 'Feed has been successfully activated.',
      });

      const result = await feedController.activateFeed(1);
      expect(result).toEqual({
        message: 'Feed has been successfully activated.',
      });
      expect(mockFeedService.activate).toHaveBeenCalledWith(1);
    });
  });

  describe('DELETE /feed/delete/:id', () => {
    it('should delete a feed', async () => {
      const result = await feedController.deleteFeed(1);
      expect(result).toEqual({
        message: 'Feed has been successfully deleted.',
      });
      expect(mockFeedService.delete).toHaveBeenCalledWith(1);
    });
  });
});
