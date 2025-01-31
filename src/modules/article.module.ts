import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from 'src/entities/article.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Article])],
})
export class ArticleModule {}
