import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from 'src/services/article.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Article } from 'src/entities/article.entity';
import { FeedService } from 'src/services/feed.service';
import {
  mockArticleRepository,
  mockFeedService,
  mockArticleCreate,
  mockArticles,
} from './mocks/article.mock';
import { Feed } from 'src/entities/feed.entity';

describe('ArticleService', () => {
  let articleService: ArticleService;
  let articleRepository: Repository<Article>;
  let feedService: FeedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockArticleRepository,
        },
        { provide: FeedService, useValue: mockFeedService },
      ],
    }).compile();

    articleService = module.get<ArticleService>(ArticleService);
    articleRepository = module.get<Repository<Article>>(
      getRepositoryToken(Article),
    );
    feedService = module.get<FeedService>(FeedService);
  });

  it('should be defined', () => {
    expect(articleService).toBeDefined();
    expect(articleRepository).toBeDefined();
    expect(feedService).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all articles', async () => {
      const result = await articleService.findAll();
      expect(result).toEqual(mockArticles);
      expect(mockArticleRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an article if found', async () => {
      const result = await articleService.findOne(1);
      expect(result).toEqual(mockArticles[0]);
    });

    it('should throw NotFoundException if article not found', async () => {
      await expect(articleService.findOne(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllFromFeed', () => {
    it('should return all articles from a specific feed', async () => {
      jest
        .spyOn(feedService, 'findOne')
        .mockResolvedValue(mockArticles[0].feed);
      jest.spyOn(articleRepository, 'find').mockResolvedValue(mockArticles);

      const result = await articleService.findAllFromFeed(1);
      expect(result).toEqual(mockArticles);
    });

    it('should throw NotFoundException if no articles found for a feed', async () => {
      jest
        .spyOn(feedService, 'findOne')
        .mockResolvedValue(mockArticles[0].feed);
      jest.spyOn(articleRepository, 'find').mockResolvedValue([]);

      await expect(articleService.findAllFromFeed(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('add', () => {
    it('should add a new article', async () => {
      jest.spyOn(mockArticleRepository, 'findOne').mockResolvedValueOnce(null);
      const result = await articleService.add(mockArticleCreate);
      expect(result).toEqual({
        message: 'Article has been successfully created.',
      });
      expect(mockArticleRepository.save).toHaveBeenCalledWith(
        mockArticleCreate,
      );
    });

    it('should throw BadRequestException if feed is missing', async () => {
      await expect(
        articleService.add({ ...mockArticleCreate, feed: undefined }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if article already exists', async () => {
      jest
        .spyOn(mockArticleRepository, 'findOne')
        .mockResolvedValueOnce(mockArticles[0]);
      await expect(articleService.add(mockArticleCreate)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return "Article is too old." when the article is older than one month', async () => {
      const oldArticle = {
        ...mockArticleCreate,
        publishedAt: new Date('2023-01-01'),
      };

      jest.spyOn(mockArticleRepository, 'findOne').mockResolvedValue(null);

      const result = await articleService.add(oldArticle);
      expect(result).toEqual({
        message: 'Article is too old.',
        created: false,
      });
    });

    it('should return "Article already exists." if article is found and isTask is true', async () => {
      jest
        .spyOn(mockArticleRepository, 'findOne')
        .mockResolvedValue(mockArticles[0]);

      const result = await articleService.add(mockArticleCreate, true);
      expect(result).toEqual({
        message: 'Article already exists.',
        created: false,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark an article as read', async () => {
      const result = await articleService.markAsRead(1);
      expect(result.hasBeenRead).toBe(true);
    });
  });

  describe('removeOldArticles', () => {
    it('should remove old articles', async () => {
      const oldArticles = mockArticles.filter(
        (article: Article) =>
          article.publishedAt <
          new Date(new Date().setMonth(new Date().getMonth() - 1)),
      );

      jest
        .spyOn(mockArticleRepository, 'find')
        .mockResolvedValueOnce(oldArticles);
      jest
        .spyOn(mockArticleRepository, 'remove')
        .mockResolvedValueOnce(oldArticles);

      const result = await articleService.removeOldArticles();

      expect(result).toEqual({
        message: `${oldArticles.length} articles have been successfully removed.`,
        count: oldArticles.length,
      });

      expect(mockArticleRepository.find).toHaveBeenCalled();
      expect(mockArticleRepository.remove).toHaveBeenCalledWith(oldArticles);
    });

    it('should return a message if no old articles are found', async () => {
      jest.spyOn(articleRepository, 'find').mockResolvedValueOnce([]);
      const result = await articleService.removeOldArticles();
      expect(result).toEqual({
        message: 'No old article have been found.',
        count: 0,
      });
    });
  });

  describe('changeSaveStatus', () => {
    it('should toggle article saved status to true', async () => {
      jest
        .spyOn(articleRepository, 'findOne')
        .mockResolvedValue(mockArticles[0]);
      jest.spyOn(articleRepository, 'save').mockResolvedValue({
        ...mockArticles[0],
        isSaved: true,
      });

      const result = await articleService.changeSaveStatus(1);
      expect(result).toEqual({
        message: 'Article has been successfully saved.',
      });
    });

    it('should toggle article saved status to false', async () => {
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue({
        ...mockArticles[0],
        isSaved: true,
      });

      jest.spyOn(articleRepository, 'save').mockResolvedValue({
        ...mockArticles[0],
        isSaved: false,
      });

      const result = await articleService.changeSaveStatus(1);
      expect(result).toEqual({
        message: 'Article has been successfully removed from savings.',
      });
    });
  });

  describe('countAllUnreadArticles', () => {
    it('should return the count of unread articles', async () => {
      const unreadArticles = [
        { id: 1, hasBeenRead: false },
        { id: 2, hasBeenRead: false },
      ];
      jest
        .spyOn(mockArticleRepository, 'find')
        .mockResolvedValue(unreadArticles);

      const count = await articleService.countAllUnreadArticles();

      expect(count).toBe(2);
      expect(mockArticleRepository.find).toHaveBeenCalledWith({
        where: { hasBeenRead: false },
      });
    });
  });

  describe('countAllUnreadArticlesFromFeed', () => {
    it('should return the count of unread articles for a specific feed', async () => {
      const feed = { id: 1 } as Feed;
      const unreadArticles = [
        { id: 1, hasBeenRead: false, feed: { id: 1 } },
        { id: 3, hasBeenRead: false, feed: { id: 1 } },
      ];
      jest
        .spyOn(mockArticleRepository, 'find')
        .mockResolvedValue(unreadArticles);

      const count = await articleService.countAllUnreadArticlesFromFeed(feed);

      expect(count).toBe(2);
      expect(mockArticleRepository.find).toHaveBeenCalledWith({
        where: { feed: { id: feed.id }, hasBeenRead: false },
      });
    });
  });

  describe('findArticlesFromFilters', () => {
    let fakeQueryBuilder: Partial<{
      leftJoinAndSelect: () => any;
      andWhere: () => any;
      orderBy: () => any;
      getMany: () => Promise<any>;
    }>;

    beforeEach(() => {
      fakeQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockArticles),
      };

      jest
        .spyOn(mockArticleRepository, 'createQueryBuilder')
        .mockReturnValue(fakeQueryBuilder);
    });

    it('should build the query without filters and return articles', async () => {
      const filter = {};

      const result = await articleService.findArticlesFromFilters(filter);

      expect(mockArticleRepository.createQueryBuilder).toHaveBeenCalledWith(
        'article',
      );
      expect(fakeQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'article.feed',
        'feed',
      );
      expect(fakeQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'feed.groups',
        'group',
      );
      expect(fakeQueryBuilder.orderBy).toHaveBeenCalledWith(
        'article.publishedAt',
        'DESC',
      );
      expect(result).toEqual(mockArticles);
    });

    it('should apply feeds and groups filters if provided', async () => {
      const filter = { feeds: [1, 2], groups: [3] };

      await articleService.findArticlesFromFilters(filter);

      expect(fakeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'feed.id IN (:...feeds)',
        { feeds: filter.feeds },
      );
      expect(fakeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'group.id IN (:...groups)',
        { groups: filter.groups },
      );
    });

    it('should apply saved and unread filters if provided', async () => {
      const filter = { saved: true, unread: true };

      await articleService.findArticlesFromFilters(filter);

      expect(fakeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'article.isSaved IS TRUE',
      );
      expect(fakeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'article.hasBeenRead IS FALSE',
      );
    });
  });
});
