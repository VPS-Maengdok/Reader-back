import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/services/auth.service';
import { UserService } from 'src/services/user.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { mockUserService, mockJwtService, mockUser } from './mocks/auth.mock';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('signIn', () => {
    it('should return an access token for valid credentials', async () => {
      const result = await authService.signIn('testUser', 'password123');

      expect(result).toEqual({ access_token: 'mocked_access_token' });
      expect(mockUserService.findOneByUsername).toHaveBeenCalledWith(
        'testUser',
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
      });
    });

    it('should throw UnauthorizedException for invalid username', async () => {
      await expect(
        authService.signIn('invalidUser', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      await expect(
        authService.signIn('testUser', 'wrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
