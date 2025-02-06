import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleController } from 'src/controllers/article.controller';
import { Article } from 'src/entities/article.entity';
import { ArticleService } from 'src/services/article.service';
import { FeedModule } from './feed.module';

@Module({
  imports: [TypeOrmModule.forFeature([Article]), forwardRef(() => FeedModule)],
  providers: [ArticleService],
  controllers: [ArticleController],
  exports: [ArticleService],
})
export class ArticleModule {}
