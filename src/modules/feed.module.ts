import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedController } from 'src/controllers/feed.controller';
import { Article } from 'src/entities/article.entity';
import { Feed } from 'src/entities/feed.entity';
import { RssExtractor } from 'src/integrations/rssExtractor.service';
import { FeedService } from 'src/services/feed.service';
import { ArticleModule } from './article.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feed, Article]),
    forwardRef(() => ArticleModule),
  ],
  providers: [FeedService, RssExtractor],
  controllers: [FeedController],
  exports: [FeedService],
})
export class FeedModule {}
