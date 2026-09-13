import bcrypt from "bcryptjs";

const DEFAULT_SALT_ROUNDS = 10;

/**
 * Hashes a plain text password using bcrypt.
 * @param password Plain text password
 * @param saltRounds Number of salt rounds (default: 10)
 * @returns Hashed password string
 */
export async function hashPassword(
  password: string,
  saltRounds: number = DEFAULT_SALT_ROUNDS
): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verifies a plain text password against a stored bcrypt hash.
 * @param password Plain text password
 * @param hash Stored bcrypt hash
 * @returns Boolean indicating whether the password matches the hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
