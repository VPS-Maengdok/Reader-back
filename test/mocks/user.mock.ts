import { NotFoundException } from '@nestjs/common';
import { User } from 'src/interfaces/user.interface';
import { Repository } from 'typeorm';

export const mockUsers: User[] = [
  { id: 1, username: 'user1', password: 'abcdef' },
  { id: 2, username: 'user2', password: 'fedcba' },
];

export const mockUser: User = {
  id: 1,
  username: 'testUser',
  password: 'abcdef',
};

export const mockUserService = {
  findAll: jest.fn().mockResolvedValue(mockUsers),
  findOne: jest.fn().mockImplementation(async (id: number) => {
    const user = mockUsers.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return Promise.resolve(user);
  }),
};

export const mockUserRepository: Partial<Repository<User>> = {
  find: jest.fn().mockResolvedValue([mockUser]),
  findOne: jest
    .fn()
    .mockImplementation(
      async (options: { where: { id?: number; username: string } }) => {
        if (options.where?.id === 1 || options.where?.username === 'testUser') {
          return Promise.resolve(mockUser);
        }
        return Promise.resolve(null);
      },
    ),
};
