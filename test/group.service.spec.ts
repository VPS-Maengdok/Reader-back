import { Test, TestingModule } from '@nestjs/testing';
import { GroupService } from 'src/services/group.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Group } from 'src/entities/group.entity';
import { FeedService } from 'src/services/feed.service';
import {
  mockGroupRepository,
  mockFeedService,
  mockGroups,
  mockGroupCreate,
} from './mocks/group.mock';

describe('GroupService', () => {
  let groupService: GroupService;
  let groupRepository: Repository<Group>;
  let feedService: FeedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        { provide: getRepositoryToken(Group), useValue: mockGroupRepository },
        { provide: FeedService, useValue: mockFeedService },
      ],
    }).compile();

    groupService = module.get<GroupService>(GroupService);
    groupRepository = module.get<Repository<Group>>(getRepositoryToken(Group));
    feedService = module.get<FeedService>(FeedService);
  });

  it('should be defined', () => {
    expect(groupService).toBeDefined();
    expect(groupRepository).toBeDefined();
    expect(feedService).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all groups', async () => {
      const result = await groupService.findAll();
      expect(result).toEqual(mockGroups);
      expect(mockGroupRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a group if found', async () => {
      const result = await groupService.findOne(1);
      expect(result).toEqual(mockGroups[0]);
    });

    it('should throw NotFoundException if group is not found', async () => {
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(null);

      await expect(groupService.findOne(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addFeedToGroup', () => {
    it('should add a feed to a group', async () => {
      jest.spyOn(groupService, 'findOne').mockResolvedValue(mockGroups[0]);
      jest.spyOn(feedService, 'findOne').mockResolvedValue({
        id: 2,
        websiteName: 'New Feed',
        websiteUrl: 'https://newfeed.com',
        rssUrl: 'https://newfeed.com/rss',
      });

      const result = await groupService.addFeedToGroup(2, 1);
      expect(result).toEqual({ message: 'Feed successfully added to Group.' });
    });

    it('should throw NotFoundException if feed does not exist', async () => {
      jest
        .spyOn(feedService, 'findOne')
        .mockRejectedValue(new NotFoundException('Feed not found.'));
      await expect(groupService.addFeedToGroup(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if group does not exist', async () => {
      jest
        .spyOn(groupService, 'findOne')
        .mockRejectedValue(new NotFoundException('Group not found.'));
      await expect(groupService.addFeedToGroup(2, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if feed is already in the group', async () => {
      jest.spyOn(groupService, 'findOne').mockResolvedValue(mockGroups[0]);
      jest.spyOn(feedService, 'findOne').mockResolvedValue(
        Promise.resolve(
          mockGroups[0].feeds?.[0] || {
            id: 99,
            websiteName: 'Fallback Feed',
            websiteUrl: '',
            rssUrl: '',
          },
        ),
      );

      await expect(groupService.addFeedToGroup(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should initialize feeds array if feeds is undefined when adding a feed', async () => {
      const mockGroupWithoutFeeds = { ...mockGroups[0], feeds: undefined };
      jest
        .spyOn(groupService, 'findOne')
        .mockResolvedValue(mockGroupWithoutFeeds);
      jest.spyOn(feedService, 'findOne').mockResolvedValue({
        id: 2,
        websiteName: 'New Feed',
        websiteUrl: 'https://newfeed.com',
        rssUrl: 'https://newfeed.com/rss',
      });

      const result = await groupService.addFeedToGroup(2, 1);
      expect(result).toEqual({ message: 'Feed successfully added to Group.' });
    });
  });

  describe('removeFeedFromGroup', () => {
    it('should remove a feed from a group', async () => {
      jest.spyOn(groupService, 'findOne').mockResolvedValue(mockGroups[0]);
      jest.spyOn(feedService, 'findOne').mockResolvedValue(
        Promise.resolve(
          mockGroups[0].feeds?.[0] || {
            id: 99,
            websiteName: 'Fallback Feed',
            websiteUrl: '',
            rssUrl: '',
          },
        ),
      );

      const result = await groupService.removeFeedFromGroup(1, 1);
      expect(result).toEqual({ message: 'Feed successfully added to Group.' });
    });

    it('should throw NotFoundException if feed is not found in group', async () => {
      jest.spyOn(groupService, 'findOne').mockResolvedValue(mockGroups[1]);
      jest.spyOn(feedService, 'findOne').mockResolvedValue(
        Promise.resolve(
          mockGroups[0].feeds?.[0] || {
            id: 99,
            websiteName: 'Fallback Feed',
            websiteUrl: '',
            rssUrl: '',
          },
        ),
      );

      await expect(groupService.removeFeedFromGroup(1, 2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if trying to remove a feed from a group with no feeds', async () => {
      const mockGroupWithoutFeeds = { ...mockGroups[0], feeds: undefined };
      jest
        .spyOn(groupService, 'findOne')
        .mockResolvedValue(mockGroupWithoutFeeds);
      jest.spyOn(feedService, 'findOne').mockResolvedValue({
        id: 2,
        websiteName: 'New Feed',
        websiteUrl: 'https://newfeed.com',
        rssUrl: 'https://newfeed.com/rss',
      });

      await expect(groupService.removeFeedFromGroup(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('add', () => {
    it('should add a new group', async () => {
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(groupRepository, 'save').mockImplementation((group) =>
        Promise.resolve({
          ...group,
          id: mockGroups.length + 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Group),
      );
      jest
        .spyOn(groupService, 'findAll')
        .mockResolvedValue([...mockGroups, mockGroupCreate]);

      const result = await groupService.add(mockGroupCreate);
      expect(result).toContainEqual(mockGroupCreate);
    });

    it('should throw BadRequestException if group already exists', async () => {
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(mockGroups[0]);

      await expect(groupService.add(mockGroupCreate)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update an existing group', async () => {
      jest.spyOn(groupService, 'findOne').mockResolvedValue(mockGroups[0]);
      jest.spyOn(groupRepository, 'save').mockResolvedValue(mockGroups[0]);

      const result = await groupService.update(mockGroups[0]);
      expect(result).toEqual(mockGroups);
      expect(mockGroupRepository.save).toHaveBeenCalledWith(mockGroups[0]);
    });

    it('should throw NotFoundException if trying to update a non-existent group', async () => {
      jest
        .spyOn(groupService, 'findOne')
        .mockRejectedValue(new NotFoundException('Group not found.'));

      await expect(groupService.update(mockGroupCreate)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a group', async () => {
      jest.spyOn(groupService, 'findOne').mockResolvedValue(mockGroups[0]);
      jest
        .spyOn(groupRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: [] });

      const result = await groupService.delete(1);
      expect(result).toEqual(mockGroups);
    });

    it('should throw NotFoundException if group does not exist', async () => {
      jest
        .spyOn(groupService, 'findOne')
        .mockRejectedValue(new NotFoundException('Group not found.'));
      await expect(groupService.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
