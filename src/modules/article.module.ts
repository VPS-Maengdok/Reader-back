import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleController } from 'src/controllers/article.controller';
import { Article } from 'src/entities/article.entity';
import { ArticleService } from 'src/services/article.service';
import { FeedModule } from './feed.module';
import { ArticleTask } from 'src/tasks/article.task';

@Module({
  imports: [TypeOrmModule.forFeature([Article]), forwardRef(() => FeedModule)],
  providers: [ArticleService, ArticleTask],
  controllers: [ArticleController],
  exports: [ArticleService],
})
export class ArticleModule {}
