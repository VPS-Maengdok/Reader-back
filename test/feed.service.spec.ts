import { Test, TestingModule } from '@nestjs/testing';
import { FeedService } from 'src/services/feed.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Feed } from 'src/entities/feed.entity';
import { RssExtractor } from 'src/integrations/rssExtractor.service';
import {
  mockFeeds,
  mockFeedCreate,
  mockFeedUpdate,
  mockFeedRepository,
  mockRssExtractor,
} from './mocks/feed.mock';
import { ArticleService } from 'src/services/article.service';
import { mockArticleService } from './mocks/article.mock';

describe('FeedService', () => {
  let feedService: FeedService;
  let feedRepository: Repository<Feed>;
  let rssExtractor: RssExtractor;
  let articleService: ArticleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: getRepositoryToken(Feed), useValue: mockFeedRepository },
        { provide: RssExtractor, useValue: mockRssExtractor },
        { provide: ArticleService, useValue: mockArticleService },
      ],
    }).compile();

    feedService = module.get<FeedService>(FeedService);
    feedRepository = module.get<Repository<Feed>>(getRepositoryToken(Feed));
    rssExtractor = module.get<RssExtractor>(RssExtractor);
    articleService = module.get<ArticleService>(ArticleService);
  });

  it('should be defined', () => {
    expect(feedService).toBeDefined();
    expect(feedRepository).toBeDefined();
    expect(rssExtractor).toBeDefined();
    expect(articleService).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of feeds', async () => {
      const feed = await feedService.findAll();
      expect(feed).toEqual(mockFeeds);
      expect(mockFeedRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a feed when found', async () => {
      const feed = await feedService.findOne(1);
      expect(feed).toEqual(mockFeeds[0]);
      expect(mockFeedRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['article', 'groups'],
      });
    });

    it('should throw NotFoundException when feed is not found', async () => {
      await expect(feedService.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('add', () => {
    it('should add a new feed', async () => {
      const feed = await feedService.add(mockFeedCreate);
      expect(feed).toEqual({
        message: 'Feed has been successfully created.',
      });
      expect(mockFeedRepository.save).toHaveBeenCalledWith(mockFeedCreate);
      expect(mockRssExtractor.fetch).toHaveBeenCalledWith(
        expect.objectContaining(mockFeedCreate),
      );
      expect(mockRssExtractor.createArticlesFromFeed).toHaveBeenCalled();
    });

    it('should throw BadRequestException if feed already exists', async () => {
      jest
        .spyOn(mockFeedRepository, 'findOne')
        .mockResolvedValueOnce(mockFeedCreate);
      await expect(feedService.add(mockFeedCreate)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update an existing feed', async () => {
      jest.spyOn(feedService, 'findOne').mockResolvedValueOnce(mockFeedUpdate);
      const feed = await feedService.update(mockFeedUpdate);
      expect(feed).toEqual({
        message: 'Feed has been successfully updated.',
      });
      expect(mockFeedRepository.update).toHaveBeenCalledWith(
        mockFeedUpdate.id,
        mockFeedUpdate,
      );
    });

    it('should throw NotFoundException if feed does not exist', async () => {
      jest
        .spyOn(feedService, 'findOne')
        .mockRejectedValueOnce(new NotFoundException('Feed not found.'));
      await expect(feedService.update(mockFeedUpdate)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing feed', async () => {
      jest.spyOn(feedService, 'findOne').mockResolvedValueOnce(mockFeeds[0]);
      const feed = await feedService.delete(1);
      expect(feed).toEqual({
        message: 'Feed has been successfully deleted.',
      });
      expect(mockFeedRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if feed does not exist', async () => {
      jest
        .spyOn(feedService, 'findOne')
        .mockRejectedValueOnce(new NotFoundException('Feed not found.'));
      await expect(feedService.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
