import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedController } from 'src/controllers/feed.controller';
import { Feed } from 'src/entities/feed.entity';
import { FeedService } from 'src/services/feed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Feed])],
  providers: [FeedService],
  controllers: [FeedController],
  exports: [FeedService],
})
export class FeedModule {}
