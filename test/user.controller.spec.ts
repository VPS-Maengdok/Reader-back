import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from 'src/controllers/user.controller';
import { UserService } from 'src/services/user.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { NotFoundException } from '@nestjs/common';
import { mockUsers, mockUserService } from './mocks/user.mock';

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
    expect(userService).toBeDefined();
  });

  it('should return all users', async () => {
    const result = await userController.getUsers();
    expect(result).toEqual(mockUsers);
    expect(mockUserService.findAll).toHaveBeenCalled();
  });

  it('should return a user by ID', async () => {
    const result = await userController.getUser(1);
    expect(result).toEqual(mockUsers[0]);
    expect(mockUserService.findOne).toHaveBeenCalledWith(1);
  });

  it('should throw NotFoundException if user is not found', async () => {
    await expect(userController.getUser(99)).rejects.toThrow(NotFoundException);
    expect(mockUserService.findOne).toHaveBeenCalledWith(99);
  });
});
