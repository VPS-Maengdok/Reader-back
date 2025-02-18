import { Group } from 'src/interfaces/group.interface';
import { NotFoundException } from '@nestjs/common';
import { DeepPartial } from 'typeorm';

export const mockGroups: Group[] = [
  {
    id: 1,
    name: 'Tech News',
    feeds: [
      {
        id: 1,
        websiteName: 'Test Feed',
        websiteUrl: 'https://feed.com',
        rssUrl: 'https://feed.com/rss',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Sports Updates',
    feeds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockGroupCreate: Group = {
  id: 3,
  name: 'Gaming News',
  feeds: [],
};

export const mockGroupRepository = {
  find: jest.fn().mockResolvedValue(mockGroups),

  findOne: jest
    .fn()
    .mockImplementation((options: { where: { id: number; name: string } }) => {
      const group = mockGroups.find(
        (group: Group) =>
          group.id === options.where.id || group.name === options.where.name,
      );
      return Promise.resolve(group || null);
    }),

  save: jest.fn().mockImplementation((group: DeepPartial<Group>) => {
    const newGroup = {
      ...group,
      id: mockGroups.length + 1,
      feeds: group.feeds ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Group;

    mockGroups.push(newGroup);
    return Promise.resolve(newGroup);
  }),

  update: jest.fn().mockResolvedValue({ affected: 1 }),

  delete: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
};

export const mockFeedService = {
  findOne: jest.fn().mockImplementation((id: number) => {
    if (id <= 0 || id > 3) throw new NotFoundException('Feed not found.');
    return Promise.resolve({
      id,
      websiteName: 'Test Feed',
      websiteUrl: 'https://feed.com',
      rssUrl: 'https://feed.com/rss',
    });
  }),
};

export const mockGroupService = {
  findAll: jest.fn().mockResolvedValue(mockGroups),
  findOne: jest.fn().mockImplementation((id: number) => {
    const group = mockGroups.find((group) => group.id === id);
    return group
      ? Promise.resolve(group)
      : Promise.reject(new NotFoundException('Group not found.'));
  }),
  add: jest.fn().mockResolvedValue([...mockGroups, mockGroupCreate]),
  update: jest.fn().mockResolvedValue([...mockGroups]),
  delete: jest.fn().mockResolvedValue([...mockGroups]),
  addFeedToGroup: jest
    .fn()
    .mockResolvedValue({ message: 'Feed successfully added to Group.' }),
  removeFeedFromGroup: jest
    .fn()
    .mockResolvedValue({ message: 'Feed successfully removed from Group.' }),
};
