import { Test, TestingModule } from '@nestjs/testing';
import { ArticleTask } from 'src/tasks/article.task';
import { ArticleService } from 'src/services/article.service';
import { Logger } from '@nestjs/common';

describe('ArticleTask', () => {
  let articleTask: ArticleTask;
  let mockArticleService: jest.Mocked<ArticleService>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockArticleService = {
      removeOldArticles: jest
        .fn()
        .mockResolvedValue({ message: 'Articles removed.', count: 5 }),
    } as unknown as jest.Mocked<ArticleService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleTask,
        { provide: ArticleService, useValue: mockArticleService },
      ],
    }).compile();

    articleTask = module.get<ArticleTask>(ArticleTask);
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(articleTask).toBeDefined();
  });

  it('should call removeOldArticles and log messages', async () => {
    const result = await articleTask.fetchOldArticles();

    expect(
      jest.spyOn(mockArticleService, 'removeOldArticles'),
    ).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(
      '🕒 Running Cron Job: Fetching old Articles from database...',
    );
    expect(loggerSpy).toHaveBeenCalledWith('5 articles have been removed.');
    expect(loggerSpy).toHaveBeenCalledWith('✅ Cron job completed.');
    expect(result).toBe(1);
  });
});
