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

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @Inject(forwardRef(() => FeedService))
    private readonly feedService: FeedService,
  ) {}

  async findAll(): Promise<ArticleInterface[]> {
    return await this.articleRepository.find({ relations: ['feed'] });
  }

  async findAllFromFeed(feed: number): Promise<ArticleInterface[]> {
    const existingFeed = await this.feedService.findOne(feed);
    const articles = await this.articleRepository.find({
      where: { feed: { id: existingFeed.id } },
      relations: ['feed'],
    });

    if (!articles) {
      throw new NotFoundException('Articles not found for this feed.');
    }

    return articles;
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

  async add(article: ArticleInterface): Promise<{ message: string }> {
    if (!article.feed) {
      throw new BadRequestException('Feed is required');
    }

    const existingFeed = await this.feedService.findOne(article.feed.id);
    const existingArticle = await this.articleRepository.findOne({
      where: { feed: { id: existingFeed.id }, url: article.url },
    });

    if (existingArticle) {
      throw new BadRequestException('Article already exists.');
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

  async removeOldArticles(): Promise<{ message: string }> {
    const limit: Date = new Date();
    limit.setMonth(limit.getMonth() - 1);

    const articles = await this.articleRepository.find({
      where: { createdAt: LessThan(limit), isSaved: false },
    });

    if (articles.length == 0) {
      return { message: 'No old article have been found.' };
    }

    await this.articleRepository.remove(articles);

    return {
      message: `${articles.length} articles have been successfully removed.`,
    };
  }
}
