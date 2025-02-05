import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Feed } from 'src/entities/feed.entity';
import { Repository } from 'typeorm';
import { Feed as FeedInterface } from 'src/interfaces/feed.interface';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Feed)
    private readonly feedRepository: Repository<Feed>,
  ) {}

  async findAll(): Promise<FeedInterface[]> {
    return await this.feedRepository.find();
  }

  async findOne(id: number): Promise<FeedInterface> {
    const feed = await this.feedRepository.findOne({
      where: { id },
      relations: ['article', 'groups'],
    });

    if (!feed) {
      throw new NotFoundException('Feed not found.');
    }

    return feed;
  }

  async add(feed: FeedInterface): Promise<{ message: string }> {
    const existingFeed = await this.feedRepository.findOne({
      where: { rssUrl: feed.rssUrl },
    });

    if (existingFeed) {
      throw new BadRequestException('Feed already exists.');
    }

    await this.feedRepository.save(feed);

    return { message: 'Feed has been successfully created.' };
  }

  async update(feed: FeedInterface): Promise<{ message: string }> {
    await this.findOne(feed.id);
    await this.feedRepository.update(feed.id, feed);

    return { message: 'Feed has been successfully updated.' };
  }

  async delete(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.feedRepository.delete(id);

    return { message: 'Feed has been successfully deleted.' };
  }
}
