import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Group } from 'src/entities/group.entity';
import { Repository } from 'typeorm';
import { Group as GroupInterface } from 'src/interfaces/group.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { FeedService } from './feed.service';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    private readonly feedService: FeedService,
  ) {}

  async findAll(): Promise<GroupInterface[]> {
    return await this.groupRepository.find({ relations: ['feeds'] });
  }

  async findOne(id: number): Promise<GroupInterface> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['feeds'],
    });

    if (!group) {
      throw new NotFoundException('Group not found.');
    }

    return group;
  }

  async addFeedToGroup(
    feed: number,
    group: number,
  ): Promise<{ message: string }> {
    const existingFeed = await this.feedService.findOne(feed);

    if (!existingFeed) {
      throw new NotFoundException('Feed not found.');
    }

    const existingGroup = await this.findOne(group);

    if (!existingGroup.feeds) {
      existingGroup.feeds = [];
    }

    const duplicatedFeed = existingGroup.feeds?.findIndex(
      (feed) => feed.id === existingFeed.id,
    );

    if (duplicatedFeed !== -1) {
      throw new BadRequestException('Feed already added to this Group.');
    }

    existingGroup.feeds?.push(existingFeed);
    await this.groupRepository.save(existingGroup);

    return { message: 'Feed successfully added to Group.' };
  }

  async removeFeedFromGroup(
    feed: number,
    group: number,
  ): Promise<{ message: string }> {
    const existingFeed = await this.feedService.findOne(feed);

    if (!existingFeed) {
      throw new NotFoundException('Feed not found.');
    }

    const existingGroup = await this.findOne(group);
    const groupFeed = existingGroup.feeds ?? [];

    const arrayPos = groupFeed.findIndex((feed) => feed.id === existingFeed.id);

    if (arrayPos === -1) {
      throw new NotFoundException('Feed not found in this Group.');
    }

    existingGroup.feeds?.splice(arrayPos, 1);
    await this.groupRepository.save(existingGroup);

    return { message: 'Feed successfully added to Group.' };
  }

  async add(group: GroupInterface): Promise<GroupInterface[]> {
    const existingGroup = await this.groupRepository.findOne({
      where: { name: group.name },
    });

    if (existingGroup) {
      throw new BadRequestException('Group already exists.');
    }

    await this.groupRepository.save(group);

    return await this.findAll();
  }

  async update(group: GroupInterface): Promise<GroupInterface[]> {
    const existingGroup = await this.findOne(group.id);

    existingGroup.name = group.name;

    if (group.feeds) {
      existingGroup.feeds = group.feeds;
    }

    await this.groupRepository.save(existingGroup);

    return await this.findAll();
  }

  async delete(id: number): Promise<GroupInterface[]> {
    await this.findOne(id);
    await this.groupRepository.delete(id);

    return await this.findAll();
  }
}
