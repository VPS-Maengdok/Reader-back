import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { Article as ArticleInterface } from 'src/interfaces/article.interface';
import { ArticleService } from 'src/services/article.service';

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  async getArticles() {
    return this.articleService.findAll();
  }

  @Get('feed/:id')
  async getArticlesFromFeed(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.findAllFromFeed(id);
  }

  @Get(':id')
  async getArticle(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('add')
  async addArticle(@Body() body: ArticleInterface) {
    return this.articleService.add(body);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Put('mark-as-read/:id')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.markAsRead(id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Put('save/:id')
  async saveArticle(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.changeSaveStatus(id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('remove-old-articles')
  async removeOldArticles() {
    return this.articleService.removeOldArticles();
  }
}
