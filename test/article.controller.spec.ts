import { Test, TestingModule } from '@nestjs/testing';
import { ArticleController } from 'src/controllers/article.controller';
import { ArticleService } from 'src/services/article.service';
import { NotFoundException } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import {
  mockArticles,
  mockArticleCreate,
  mockArticleService,
} from './mocks/article.mock';

describe('ArticleController', () => {
  let articleController: ArticleController;
  let articleService: ArticleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [{ provide: ArticleService, useValue: mockArticleService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    articleController = module.get<ArticleController>(ArticleController);
    articleService = module.get<ArticleService>(ArticleService);
  });

  it('should be defined', () => {
    expect(articleController).toBeDefined();
    expect(articleService).toBeDefined();
  });

  describe('GET /article', () => {
    it('should return all articles', async () => {
      const result = await articleController.getArticles();
      expect(result).toEqual(mockArticles);
      expect(mockArticleService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /article/feed/:id', () => {
    it('should return articles from a specific feed', async () => {
      const result = await articleController.getArticlesFromFeed(1);
      expect(result).toEqual(
        mockArticles.filter((article) => article?.feed?.id === 1),
      );
      expect(mockArticleService.findAllFromFeed).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /article/:id', () => {
    it('should return an article if found', async () => {
      const result = await articleController.getArticle(1);
      expect(result).toEqual(mockArticles[0]);
      expect(mockArticleService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if article not found', async () => {
      await expect(articleController.getArticle(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('POST /article/add', () => {
    it('should add a new article', async () => {
      const result = await articleController.addArticle(mockArticleCreate);
      expect(result).toEqual({
        message: 'Article has been successfully created.',
      });
      expect(mockArticleService.add).toHaveBeenCalledWith(mockArticleCreate);
    });
  });

  describe('PUT /article/mark-as-read/:id', () => {
    it('should mark an article as read', async () => {
      const result = await articleController.markAsRead(1);
      expect(result.hasBeenRead).toBe(true);
      expect(mockArticleService.markAsRead).toHaveBeenCalledWith(1);
    });
  });

  describe('PUT /article/save/:id', () => {
    it('should change save status of an article', async () => {
      const result = await articleController.saveArticle(1);
      expect(result.message).toEqual('Article has been successfully saved.');
      expect(mockArticleService.changeSaveStatus).toHaveBeenCalledWith(1);
    });
  });

  describe('DELETE /article/remove-old-articles', () => {
    it('should remove old articles', async () => {
      const result = await articleController.removeOldArticles();
      expect(result).toEqual({
        message: '5 articles have been successfully removed.',
        count: 5,
      });
      expect(mockArticleService.removeOldArticles).toHaveBeenCalled();
    });
  });
});
