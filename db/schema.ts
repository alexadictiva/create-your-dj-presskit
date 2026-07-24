import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const djs = sqliteTable("djs", {
  id: text("id").primaryKey(),
  artistName: text("artist_name").notNull(),
  realName: text("real_name").notNull(),
  city: text("city").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  biography: text("biography").notNull(),
  experiences: text("experiences").notNull(),
  genres: text("genres").notNull(),
  equipment: text("equipment").notNull(),
  instagram: text("instagram").notNull(),
  soundcloud: text("soundcloud").notNull(),
  website: text("website").notNull(),
  template: text("template").notNull(),
  photos: text("photos").notNull(),
  createdAt: text("created_at").notNull(),
});
