import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Article } from 'src/entities/article.entity';
import { Article as ArticleInterface } from 'src/interfaces/article.interface';
import { LessThan, Repository } from 'typeorm';
import { FeedService } from './feed.service';
import { Feed } from 'src/entities/feed.entity';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @Inject(forwardRef(() => FeedService))
    private readonly feedService: FeedService,
  ) {}

  async findAll(): Promise<ArticleInterface[]> {
    const articles = await this.articleRepository.find({
      relations: ['feed'],
      order: {
        publishedAt: 'DESC',
      },
    });

    articles.forEach((article) => {
      if (article.content) {
        delete (article as ArticleInterface).content;
      }
    });

    return articles;
  }

  async findAllFromFeed(feed: number): Promise<ArticleInterface[]> {
    const existingFeed = await this.feedService.findOne(feed);
    const articles = await this.articleRepository.find({
      where: { feed: { id: existingFeed.id } },
      relations: ['feed'],
    });

    if (!articles || articles.length === 0) {
      throw new NotFoundException('Articles not found for this feed.');
    }

    return articles;
  }

  async countAllUnreadArticles(): Promise<number> {
    const unreadArticles = await this.articleRepository.find({
      where: { hasBeenRead: false },
    });

    return unreadArticles.length;
  }

  async countAllUnreadArticlesFromFeed(feed: Feed): Promise<number> {
    const unreadArticles = await this.articleRepository.find({
      where: { feed: { id: feed.id }, hasBeenRead: false },
    });

    return unreadArticles.length;
  }

  async findArticlesFromFilters(filter: {
    feeds?: number[];
    groups?: number[];
    saved?: boolean;
    unread?: boolean;
  }): Promise<ArticleInterface[]> {
    const { feeds, groups, saved, unread } = filter;
    const queryBuilder = this.articleRepository.createQueryBuilder('article');

    queryBuilder
      .leftJoinAndSelect('article.feed', 'feed')
      .leftJoinAndSelect('feed.groups', 'group')
      .where('feed.isActivate IS TRUE');

    if (feeds && feeds.length > 0) {
      queryBuilder.andWhere('feed.id IN (:...feeds)', { feeds });
    }

    if (groups && groups.length > 0) {
      queryBuilder.andWhere('group.id IN (:...groups)', { groups });
    }

    if (saved) {
      queryBuilder.andWhere('article.isSaved IS TRUE');
    }

    if (unread) {
      queryBuilder.andWhere('article.hasBeenRead IS FALSE');
    }

    queryBuilder.orderBy('article.publishedAt', 'DESC');

    return await queryBuilder.getMany();
  }

  async findOne(id: number): Promise<ArticleInterface> {
    const article = await this.articleRepository.findOne({
      where: { id },
      relations: ['feed'],
    });

    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    return article;
  }

  async add(
    article: ArticleInterface,
    isTask: boolean = false,
  ): Promise<{ message: string; created?: boolean }> {
    const limitDate = new Date();
    limitDate.setMonth(limitDate.getMonth() - 6);

    if (!article.feed) {
      throw new BadRequestException('Feed is required');
    }

    const existingFeed = await this.feedService.findOne(article.feed.id);
    const existingArticle = await this.articleRepository.findOne({
      where: { feed: { id: existingFeed.id }, url: article.url },
    });

    if (existingArticle && !isTask) {
      throw new BadRequestException('Article already exists.');
    } else if (existingArticle && isTask) {
      return { message: 'Article already exists.', created: false };
    }

    if (article.publishedAt < limitDate) {
      return { message: 'Article is too old.', created: false };
    }

    await this.articleRepository.save(article);

    return { message: 'Article has been successfully created.' };
  }

  async markAsRead(id: number): Promise<ArticleInterface> {
    const article = await this.findOne(id);
    article.hasBeenRead = true;

    return await this.articleRepository.save(article);
  }

  async changeSaveStatus(id: number): Promise<{ message: string }> {
    const article = await this.findOne(id);
    article.isSaved = !article.isSaved;
    await this.articleRepository.save(article);

    return {
      message: article.isSaved
        ? 'Article has been successfully saved.'
        : 'Article has been successfully removed from savings.',
    };
  }

  async removeOldArticles(): Promise<{ message: string; count?: number }> {
    const limit: Date = new Date();
    limit.setMonth(limit.getMonth() - 6);

    const articles = await this.articleRepository.find({
      where: { createdAt: LessThan(limit), isSaved: false },
    });

    if (articles.length == 0) {
      return { message: 'No old article have been found.', count: 0 };
    }

    await this.articleRepository.remove(articles);

    return {
      message: `${articles.length} articles have been successfully removed.`,
      count: articles.length,
    };
  }
}
