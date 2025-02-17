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

describe('FeedController', () => {
  let feedController: FeedController;
  let feedService: FeedService;
  let rssTask: RssTask;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        { provide: FeedService, useValue: mockFeedService },
        { provide: RssTask, useValue: mockRssTask },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) }) // Mock AuthGuard to allow access
      .compile();

    feedController = module.get<FeedController>(FeedController);
    feedService = module.get<FeedService>(FeedService);
    rssTask = module.get<RssTask>(RssTask);
  });

  it('should be defined', () => {
    expect(feedController).toBeDefined();
    expect(feedService).toBeDefined();
    expect(rssTask).toBeDefined();
  });

  describe('GET /feed', () => {
    it('should return an array of feeds', async () => {
      const result = await feedController.getFeeds();
      expect(result).toEqual(mockFeeds);
      expect(mockFeedService.findAll).toHaveBeenCalled();
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
