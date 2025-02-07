import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArticleService } from 'src/services/article.service';

@Injectable()
export class ArticleTask {
  constructor(private readonly articleService: ArticleService) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async fetchOldArticles(): Promise<number> {
    console.log('🕒 Running Cron Job: Fetching old Articles from database...');
    const removedArticles = this.articleService.removeOldArticles();

    console.log(`${(await removedArticles).count} articles have been removed.`);
    console.log('✅ Cron job completed.');
    return 1;
  }
}
