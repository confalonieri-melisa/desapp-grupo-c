import { eq } from "drizzle-orm";
import { db as defaultDatabase, type Database } from "@/db";
import { users, type UserRow } from "@/db/schema";
import { User } from "@/models/User";
import { UserRole } from "@/models/enums";

export class UserRepository {
  constructor(private readonly database: Database = defaultDatabase) {}

  async findById(id: string): Promise<User | null> {
    const rows = await this.database
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return rows[0] ? toUser(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.database
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return rows[0] ? toUser(rows[0]) : null;
  }

  async save(user: User): Promise<User> {
    const rows = await this.database
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        name: user.name,
        password: user.passwordHash ?? "",
        role: user.role,
        creditBalance: user.creditBalance.toFixed(2),
        createdAt: user.createdAt,
      })
      .returning();

    if (!rows[0]) {
      throw new Error("User could not be persisted");
    }

    return toUser(rows[0]);
  }
}

export function toUser(row: UserRow): User {
  return new User({
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password,
    role: row.role as UserRole,
    creditBalance: Number(row.creditBalance),
    createdAt: row.createdAt,
  });
}
