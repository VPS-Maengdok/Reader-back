import { NotFoundException } from '@nestjs/common';
import { Feed } from 'src/interfaces/feed.interface';

export const mockFeeds: Feed[] = [
  {
    id: 1,
    websiteName: 'testWebsite1',
    websiteUrl: 'testWebsiteUrl1',
    rssUrl: 'testRssUrl1',
  },
  {
    id: 2,
    websiteName: 'testWebsite2',
    websiteUrl: 'testWebsiteUrl2',
    rssUrl: 'testRssUrl2',
  },
];

export const mockFeedCreate: Feed = {
  id: 3,
  websiteName: 'testAddWebsite',
  websiteUrl: 'testAddWebsiteUrl',
  rssUrl: 'https://feeds.feedburner.com/symfony/blog',
};

export const mockFeedUpdate: Feed = {
  id: 2,
  websiteName: 'testUpdateWebsite',
  websiteUrl: 'testUpdateWebsiteUrl',
  rssUrl: 'https://feeds.feedburner.com/symfony/blog',
};

export const mockFeedRepository = {
  find: jest.fn().mockResolvedValue(mockFeeds),
  findOne: jest
    .fn()
    .mockImplementation(
      (options: { where: { id?: number; rssUrl?: string } }) => {
        const feed = mockFeeds.find(
          (feed) =>
            feed.id === options.where?.id ||
            feed.rssUrl === options.where?.rssUrl,
        );
        return Promise.resolve(feed || null);
      },
    ),
  save: jest
    .fn()
    .mockImplementation((feed) =>
      Promise.resolve({ ...feed, id: mockFeeds.length + 1 }),
    ),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
};

export const mockRssExtractor = {
  fetch: jest.fn().mockResolvedValue([]),
  createArticlesFromFeed: jest.fn().mockResolvedValue(undefined),
};

export const mockFeedService = {
  findAll: jest.fn().mockResolvedValue(mockFeeds),
  findOne: jest.fn().mockImplementation((id: number) => {
    const feed = mockFeeds.find((feed: Feed) => feed.id === id) as Feed;

    if (!feed) {
      throw new NotFoundException('Feed not found.');
    }

    return Promise.resolve(feed);
  }),
  add: jest
    .fn()
    .mockResolvedValue({ message: 'Feed has been successfully created.' }),
  update: jest
    .fn()
    .mockResolvedValue({ message: 'Feed has been successfully updated.' }),
  delete: jest
    .fn()
    .mockResolvedValue({ message: 'Feed has been successfully deleted.' }),
};

export const mockRssTask = {
  fetchFeedsFromDatabase: jest.fn().mockResolvedValue(['rssFeed1', 'rssFeed2']),
};
