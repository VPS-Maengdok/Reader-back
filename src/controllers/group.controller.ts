import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GroupService } from 'src/services/group.service';
import { Group as GroupInterface } from 'src/interfaces/group.interface';
import { AuthGuard } from 'src/guards/auth.guard';
import { FeedService } from 'src/services/feed.service';
import { Feed } from 'src/interfaces/feed.interface';

@Controller('group')
export class GroupController {
  constructor(
    private readonly groupService: GroupService,
    private readonly feedService: FeedService,
  ) {}

  @Get()
  async getGroups(@Query('isActivate') isActivate?: string) {
    if (isActivate === 'true' || isActivate === 'false') {
      return this.groupService.findAll(isActivate === 'true');
    }

    return this.groupService.findAll();
  }

  @Get(':id')
  async getFeed(@Param('id', ParseIntPipe) id: number) {
    return this.groupService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Put('agroup/:grougroup')
  async addFeedToGroup(
    @Param('group', ParseIntPipe) group: number,
    @Param('feed', ParseIntPipe) feed: number,
  ) {
    return this.groupService.addFeedToGroup(feed, group);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Put('remove-feed/:group/:feed')
  async removeFeedFromGroup(
    @Param('group', ParseIntPipe) group: number,
    @Param('feed', ParseIntPipe) feed: number,
  ) {
    return this.groupService.removeFeedFromGroup(feed, group);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('add')
  async addGroup(@Body() body: GroupInterface) {
    if (body.feeds && Array.isArray(body.feeds)) {
      const feedIds = body.feeds as unknown as number[];

      body.feeds = await this.transformIdArrayToFeeds(feedIds);
    }

    return this.groupService.add(body);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('update')
  async updateGroup(@Body() body: GroupInterface) {
    if (body.feeds && Array.isArray(body.feeds)) {
      const feedIds = body.feeds as unknown as number[];

      body.feeds = await this.transformIdArrayToFeeds(feedIds);
    }

    return this.groupService.update(body);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('delete/:id')
  async deleteGroup(@Param('id', ParseIntPipe) id: number) {
    return this.groupService.delete(id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Put('activate/:id')
  async activateGroup(@Param('id', ParseIntPipe) id: number) {
    return this.groupService.activate(id);
  }

  private async transformIdArrayToFeeds(bodyFeed: number[]): Promise<Feed[]> {
    const feeds: Feed[] = await Promise.all(
      bodyFeed.map(async (id: number) => {
        const feed = await this.feedService.findOne(id);
        return feed;
      }),
    );

    return feeds.filter((feed) => feed != null);
  }
}
