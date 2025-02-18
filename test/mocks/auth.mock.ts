import { UnauthorizedException } from '@nestjs/common';
import { User } from 'src/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

export const mockUser: User = {
  id: 1,
  username: 'testUser',
  password: 'password123',
} as User;

export const mockUserService = {
  findOneByUsername: jest.fn(async (username: string): Promise<User | null> => {
    return username === 'testUser'
      ? Promise.resolve(mockUser)
      : Promise.resolve(null);
  }),
};

export const mockJwtService: Pick<JwtService, 'signAsync'> = {
  signAsync: jest.fn(async () => Promise.resolve('mocked_access_token')),
};

export const mockAuthService = {
  signIn: jest.fn(async (username: string, password: string) => {
    const user = await mockUserService.findOneByUsername(username);

    if (!user || user.password !== password) {
      throw new UnauthorizedException();
    }

    return {
      access_token: await mockJwtService.signAsync({
        sub: user.id,
        username: user.username,
      }),
    };
  }),
};
