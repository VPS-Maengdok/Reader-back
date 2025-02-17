import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/controllers/auth.controller';
import { AuthService } from 'src/services/auth.service';
import { mockAuthService } from './mocks/auth.mock';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
    expect(authService).toBeDefined();
  });

  describe('signIn', () => {
    it('should return an access token for valid credentials', async () => {
      jest
        .spyOn(mockAuthService, 'signIn')
        .mockResolvedValue({ access_token: 'mocked_access_token' });

      const result = await authController.signIn({
        username: 'testUser',
        password: 'password123',
      });

      expect(result).toEqual({ access_token: 'mocked_access_token' });
      expect(mockAuthService.signIn).toHaveBeenCalledWith(
        'testUser',
        'password123',
      );
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest
        .spyOn(mockAuthService, 'signIn')
        .mockRejectedValue(new UnauthorizedException());

      await expect(
        authController.signIn({
          username: 'invalidUser',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
