import { NotFoundException } from '@nestjs/common';
import { Article } from 'src/entities/article.entity';
import { Feed } from 'src/entities/feed.entity';
import { Article as ArticleInterface } from 'src/interfaces/article.interface';

export let mockArticles: Article[] = [
  {
    id: 1,
    title: 'Test Article 1',
    url: 'https://example.com/article1',
    description: 'This is a test article 1',
    content: 'Content of test article 1',
    author: 'Author1',
    publishedAt: new Date('2025-01-01'),
    isSaved: false,
    hasBeenRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    feed: {
      id: 1,
      websiteName: 'Test Feed',
      websiteUrl: 'https://feed.com',
      rssUrl: 'https://feed.com/rss',
    },
  },
  {
    id: 2,
    title: 'Test Article 2',
    url: 'https://example.com/article2',
    description: 'This is a test article 2',
    content: 'Content of test article 2',
    author: 'Author2',
    publishedAt: new Date('2025-01-01'),
    isSaved: true,
    hasBeenRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    feed: {
      id: 2,
      websiteName: 'Test Feed 2',
      websiteUrl: 'https://feed.com',
      rssUrl: 'https://feed.com/rss',
    },
  },
];

export const mockArticleCreate: ArticleInterface = {
  title: 'New Article',
  url: 'https://example.com/new-article',
  description: 'This is a new test article',
  content: 'New test article content',
  author: 'Author3',
  publishedAt: new Date(),
  feed: {
    id: 3,
    websiteName: 'Test Feed',
    websiteUrl: 'https://feed.com',
    rssUrl: 'https://feed.com/rss',
  },
};

export const mockArticleRepository = {
  find: jest.fn().mockResolvedValue(mockArticles),

  findOne: jest
    .fn()
    .mockImplementation(
      (options: { where: { id: number; url: string; feed: Feed } }) => {
        if (options.where?.id) {
          const article = mockArticles.find(
            (article) => article?.id === options.where.id,
          );
          return Promise.resolve(article || null);
        }

        if (options.where?.feed?.id) {
          return Promise.resolve(
            mockArticles.filter(
              (article) => article?.feed?.id === options.where.feed.id,
            ),
          );
        }

        if (options.where?.url) {
          return Promise.resolve(
            mockArticles.find((article) => article.url === options.where.url) ||
              null,
          );
        }

        return Promise.resolve(null);
      },
    ),

  save: jest.fn().mockImplementation((article: Article) => {
    const newArticle = { ...article, id: mockArticles.length + 1 };
    mockArticles.push(newArticle);
    return Promise.resolve(newArticle);
  }),

  update: jest.fn().mockResolvedValue({ affected: 1 }),

  remove: jest.fn().mockImplementation((ids: number[]) => {
    const initialLength = mockArticles.length;
    mockArticles = mockArticles.filter(
      (article: Article) =>
        article.id !== undefined && !ids.includes(article.id),
    );
    return Promise.resolve({ affected: initialLength - mockArticles.length });
  }),

  createQueryBuilder: jest.fn().mockResolvedValue({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(mockArticles),
  }),
};

export const mockFeedService = {
  findOne: jest.fn().mockImplementation((id: number) => {
    if (id <= 0 || id > 3) throw new NotFoundException('Feed not found.');
    return Promise.resolve({
      id,
      websiteName: 'Test Feed',
      websiteUrl: 'https://feed.com',
      rssUrl: 'https://feed.com/rss',
    });
  }),
};

export const mockArticleService = {
  findAll: jest.fn().mockResolvedValue(mockArticles),
  findAllFromFeed: jest.fn().mockImplementation((id: number) => {
    return Promise.resolve(
      mockArticles.filter((article) => article?.feed?.id === id),
    );
  }),
  findOne: jest.fn().mockImplementation((id: number) => {
    const article = mockArticles.find((article) => article.id === id);
    return article
      ? Promise.resolve(article)
      : Promise.reject(new NotFoundException('Article not found.'));
  }),
  add: jest
    .fn()
    .mockResolvedValue({ message: 'Article has been successfully created.' }),
  markAsRead: jest
    .fn()
    .mockResolvedValue({ ...mockArticles[0], hasBeenRead: true }),
  changeSaveStatus: jest
    .fn()
    .mockResolvedValue({ message: 'Article has been successfully saved.' }),
  removeOldArticles: jest.fn().mockResolvedValue({
    message: '5 articles have been successfully removed.',
    count: 5,
  }),
  countAllUnreadArticles: jest.fn().mockResolvedValue(2),
  countAllUnreadArticlesFromFeed: jest.fn().mockResolvedValue(0),
  findArticlesFromFilters: jest.fn().mockResolvedValue(mockArticles),
};
