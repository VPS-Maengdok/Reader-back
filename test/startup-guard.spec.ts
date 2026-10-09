import {
  assertSecureConfig,
  MIN_SECRET_LENGTH,
} from 'src/config/startup-guard';

describe('assertSecureConfig', () => {
  const strong = 'x'.repeat(MIN_SECRET_LENGTH);

  it('accepts secrets of at least 16 characters', () => {
    expect(() =>
      assertSecureConfig({ ADMIN_PASSWORD: strong, JWT_SECRET: strong }),
    ).not.toThrow();
  });

  it('refuses missing secrets', () => {
    expect(() => assertSecureConfig({})).toThrow(
      /ADMIN_PASSWORD and JWT_SECRET/,
    );
  });

  it('refuses empty secrets', () => {
    expect(() =>
      assertSecureConfig({ ADMIN_PASSWORD: '', JWT_SECRET: strong }),
    ).toThrow(/ADMIN_PASSWORD/);
  });

  it('refuses secrets made of whitespace only', () => {
    expect(() =>
      assertSecureConfig({
        ADMIN_PASSWORD: ' '.repeat(MIN_SECRET_LENGTH),
        JWT_SECRET: strong,
      }),
    ).toThrow(/ADMIN_PASSWORD/);
  });

  it('refuses 15-character secrets', () => {
    const short = 'x'.repeat(MIN_SECRET_LENGTH - 1);
    expect(() =>
      assertSecureConfig({ ADMIN_PASSWORD: strong, JWT_SECRET: short }),
    ).toThrow(/JWT_SECRET/);
  });

  it('refuses the former default password', () => {
    expect(() =>
      assertSecureConfig({ ADMIN_PASSWORD: 'password', JWT_SECRET: strong }),
    ).toThrow(/ADMIN_PASSWORD/);
  });

  it('never leaks secret values in the error message', () => {
    const weakValue = 'fifteen-chars-ok'.slice(0, MIN_SECRET_LENGTH - 1);
    expect(() =>
      assertSecureConfig({ ADMIN_PASSWORD: weakValue, JWT_SECRET: strong }),
    ).toThrow(/^(?!.*fifteen-chars)(?!.*xxxxxxxx).*$/s);
  });
});
