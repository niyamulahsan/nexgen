import { mysqlTable, int, varchar } from "drizzle-orm/mysql-core";

export const welcomes = mysqlTable("welcomes", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull()
});
