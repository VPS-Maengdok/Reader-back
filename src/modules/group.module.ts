import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupController } from 'src/controllers/group.controller';
import { Group } from 'src/entities/group.entity';
import { GroupService } from 'src/services/group.service';
import { FeedModule } from './feed.module';
import { Feed } from 'src/entities/feed.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Feed]), FeedModule],
  providers: [GroupService],
  controllers: [GroupController],
  exports: [GroupService],
})
export class GroupModule {}
