import { AuthGuard } from 'src/guards/auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({});
    authGuard = new AuthGuard(jwtService);
  });

  function mockExecutionContext(
    headers: Record<string, string | undefined>,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () =>
          ({
            headers,
          }) as Request,
      }),
    } as ExecutionContext;
  }

  it('should return true when token is valid', async () => {
    jest
      .spyOn(jwtService, 'verifyAsync')
      .mockResolvedValue({ sub: 1, username: 'testUser' });

    const context = mockExecutionContext({
      authorization: 'Bearer valid.jwt.token',
    });

    await expect(authGuard.canActivate(context)).resolves.toBe(true);
  });

  it('should throw UnauthorizedException if no token is provided', async () => {
    const context = mockExecutionContext({});

    await expect(authGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if token is invalid', async () => {
    jest
      .spyOn(jwtService, 'verifyAsync')
      .mockRejectedValue(new Error('Invalid token'));

    const context = mockExecutionContext({
      authorization: 'Bearer invalid.jwt.token',
    });

    await expect(authGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should assign the decoded payload to request["user"]', async () => {
    const mockPayload = { sub: 1, username: 'testUser' };

    jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

    const request = {
      headers: { authorization: 'Bearer valid.jwt.token' },
    } as Request;

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await authGuard.canActivate(context);

    expect(request['user']).toEqual(mockPayload);
  });
});
