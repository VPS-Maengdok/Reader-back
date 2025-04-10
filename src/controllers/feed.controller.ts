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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { FeedService } from 'src/services/feed.service';
import { Feed as FeedInterface } from 'src/interfaces/feed.interface';
import { RssTask } from 'src/tasks/rss.task';
@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly rssTask: RssTask,
  ) {}

  @Get()
  async getFeeds() {
    return this.feedService.findAll();
  }

  @Get(':id')
  async getFeed(@Param('id', ParseIntPipe) id: number) {
    return this.feedService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('add')
  async addFeed(@Body() body: FeedInterface) {
    return this.feedService.add(body);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('update')
  async updateFeed(@Body() body: FeedInterface) {
    return this.feedService.update(body);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('delete/:id')
  async deleteFeed(@Param('id', ParseIntPipe) id: number) {
    return this.feedService.delete(id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Put('activate/:id')
  async activateFeed(@Param('id', ParseIntPipe) id: number) {
    return this.feedService.activate(id);
  }
}
