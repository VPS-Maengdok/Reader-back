import { Test, TestingModule } from '@nestjs/testing';
import { GroupController } from 'src/controllers/group.controller';
import { GroupService } from 'src/services/group.service';
import { NotFoundException } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import {
  mockGroups,
  mockGroupCreate,
  mockGroupService,
} from './mocks/group.mock';
import { ArticleService } from 'src/services/article.service';
import { FeedService } from 'src/services/feed.service';
import { mockArticleService, mockFeedService } from './mocks/article.mock';

describe('GroupController', () => {
  let groupController: GroupController;
  let groupService: GroupService;
  let articleService: ArticleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupController],
      providers: [
        { provide: GroupService, useValue: mockGroupService },
        { provide: FeedService, useValue: mockFeedService },
        { provide: ArticleService, useValue: mockArticleService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    groupController = module.get<GroupController>(GroupController);
    groupService = module.get<GroupService>(GroupService);
    articleService = module.get<ArticleService>(ArticleService);
  });

  it('should be defined', () => {
    expect(groupController).toBeDefined();
    expect(groupService).toBeDefined();
    expect(articleService).toBeDefined();
  });

  describe('GET /group', () => {
    it('should return all groups', async () => {
      const result = await groupController.getGroups();
      expect(result).toEqual(mockGroups);
      expect(mockGroupService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /group?isActivate=true', () => {
    it('should return all groups', async () => {
      const result = await groupController.getGroups('true');
      expect(result).toEqual(mockGroups);
      expect(mockGroupService.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('GET /group?isActivate=false', () => {
    it('should return an empty array of groups', async () => {
      const result = await groupController.getGroups('false');
      expect(result).toEqual([]);
      expect(mockGroupService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('GET /group/:id', () => {
    it('should return a group if found', async () => {
      const result = await groupController.getFeed(1);
      expect(result).toEqual(mockGroups[0]);
      expect(mockGroupService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if group not found', async () => {
      await expect(groupController.getFeed(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PUT /group/add-feed/:group/:feed', () => {
    it('should add a feed to a group', async () => {
      const result = await groupController.addFeedToGroup(1, 2);
      expect(result).toEqual({ message: 'Feed successfully added to Group.' });
      expect(mockGroupService.addFeedToGroup).toHaveBeenCalledWith(2, 1);
    });
  });

  describe('PUT /group/remove-feed/:group/:feed', () => {
    it('should remove a feed from a group', async () => {
      const result = await groupController.removeFeedFromGroup(1, 2);
      expect(result).toEqual({
        message: 'Feed successfully removed from Group.',
      });
      expect(mockGroupService.removeFeedFromGroup).toHaveBeenCalledWith(2, 1);
    });
  });

  describe('POST /group/add', () => {
    it('should add a new group', async () => {
      const result = await groupController.addGroup(mockGroupCreate);
      expect(result).toEqual([...mockGroups, mockGroupCreate]);
      expect(mockGroupService.add).toHaveBeenCalledWith(mockGroupCreate);
    });
  });

  describe('PATCH /group/update', () => {
    it('should update an existing group', async () => {
      const result = await groupController.updateGroup(mockGroups[0]);
      expect(result).toEqual(mockGroups);
      expect(mockGroupService.update).toHaveBeenCalledWith(mockGroups[0]);
    });
  });

  describe('DELETE /group/delete/:id', () => {
    it('should delete a group', async () => {
      const result = await groupController.deleteGroup(1);
      expect(result).toEqual(mockGroups);
      expect(mockGroupService.delete).toHaveBeenCalledWith(1);
    });
  });
});
