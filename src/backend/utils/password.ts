/**
 * Password handling boundary.
 *
 * The academic scope stores the password directly. Keeping this boundary
 * allows the application service to remain independent from that decision.
 */
export function verifyPassword(password: string, storedPassword: string): boolean {
  return password === storedPassword;
}
