import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArticleService } from 'src/services/article.service';

@Injectable()
export class ArticleTask {
  private readonly logger = new Logger(ArticleTask.name);

  constructor(private readonly articleService: ArticleService) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async fetchOldArticles(): Promise<number> {
    this.logger.log(
      '🕒 Running Cron Job: Fetching old Articles from database...',
    );
    const removedArticles = this.articleService.removeOldArticles();

    this.logger.log(
      `${(await removedArticles).count} articles have been removed.`,
    );
    this.logger.log('✅ Cron job completed.');
    return 1;
  }
}
