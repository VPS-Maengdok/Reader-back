import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedController } from 'src/controllers/feed.controller';
import { Article } from 'src/entities/article.entity';
import { Feed } from 'src/entities/feed.entity';
import { FeedService } from 'src/services/feed.service';
import { ArticleModule } from './article.module';
import { RssTask } from 'src/tasks/rss.task';
import { RssExtractor } from 'src/integrations/rssExtractor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feed, Article]),
    forwardRef(() => ArticleModule),
  ],
  providers: [FeedService, RssTask, RssExtractor],
  controllers: [FeedController],
  exports: [FeedService],
})
export class FeedModule {}
