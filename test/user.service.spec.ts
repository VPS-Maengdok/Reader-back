import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/services/user.service';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { mockUser, mockUserRepository } from './mocks/user.mock';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
    expect(userRepository).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = await userService.findAll();
      expect(users).toEqual([mockUser]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const user = await userService.findOne(1);
      expect(user).toEqual(mockUser);
    });

    it('should throw NotFoundException when user is not found', async () => {
      await expect(userService.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByUsername', () => {
    it('should return a user when found', async () => {
      const user = await userService.findOneByUsername('testUser');
      expect(user).toEqual(mockUser);
    });

    it('should throw NotFoundException when user is not found', async () => {
      await expect(userService.findOneByUsername('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
