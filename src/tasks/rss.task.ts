import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssExtractor } from 'src/integrations/rssExtractor.service';
import { Article } from 'src/interfaces/article.interface';
import { Feed } from 'src/interfaces/feed.interface';
import { FeedService } from 'src/services/feed.service';

@Injectable()
export class RssTask {
  private articleCount: number;
  private readonly logger = new Logger(RssTask.name);

  constructor(
    private readonly feedService: FeedService,
    private readonly rssExtractor: RssExtractor,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async fetchFeedsFromDatabase(): Promise<number> {
    this.logger.log('🕒 Running Cron Job: Fetching feeds from the database...');
    const feeds = this.feedService.findAll();

    this.logger.log(`${(await feeds).length} RSS Feeds have been found.`);
    await Promise.all((await feeds).map((feed) => this.extractFeed(feed)));

    this.logger.log('✅ Cron job completed.');
    return 1;
  }

  private async extractFeed(feed: Feed) {
    this.logger.log(`Extracting article from ${feed.websiteName} RSS`);
    const articles = await this.rssExtractor.fetch(feed);

    await this.createArticlesFromExtraction(articles, feed);
  }

  private async createArticlesFromExtraction(articles: Article[], feed: Feed) {
    this.articleCount = 0;
    this.logger.log(
      `Creating new articles from the ${articles.length} extracted in ${feed.websiteName}.`,
    );
    const articlesCreated =
      await this.rssExtractor.createArticlesFromFeed(articles);

    this.articleCount = articlesCreated.count + this.articleCount;

    this.logger.log(`${articlesCreated.count} new articles have been created.`);
  }
}
