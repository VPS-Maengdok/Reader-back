export const MIN_SECRET_LENGTH = 16;

const REQUIRED_SECRETS = ['ADMIN_PASSWORD', 'JWT_SECRET'] as const;

/**
 * Refuses to start with a missing or weak admin password / JWT secret.
 * Only the variable names are reported, never their values.
 */
export function assertSecureConfig(
  env: Record<string, string | undefined> = process.env,
): void {
  const weak = REQUIRED_SECRETS.filter(
    (name) => (env[name] ?? '').trim().length < MIN_SECRET_LENGTH,
  );

  if (weak.length > 0) {
    throw new Error(
      `Refusing to start: ${weak.join(' and ')} must be set and at least ${MIN_SECRET_LENGTH} characters long.`,
    );
  }
}
