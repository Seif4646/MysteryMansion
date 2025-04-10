import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Original users table (keep for reference)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Game Players
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sessionId: text("session_id").notNull().unique(),
  roomCode: text("room_code"),
  ready: boolean("ready").default(false),
  isHost: boolean("is_host").default(false),
  points: integer("points").notNull().default(0), // Add points field for player score tracking
});

// Game Rooms
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  status: text("status").notNull().default("waiting"), // "waiting", "playing", "ended"
  playersCount: integer("players_count").notNull().default(0),
  maxPlayers: integer("max_players").notNull().default(6),
  minPlayers: integer("min_players").notNull().default(2),
  gameState: jsonb("game_state"), // Store the murder solution and game progress
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for each table
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPlayerSchema = createInsertSchema(players).pick({
  name: true,
  sessionId: true,
  roomCode: true,
  isHost: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  code: true,
  maxPlayers: true,
  minPlayers: true,
});

// Define game data types
export const suspects = [
  "colonel_mustard",
  "professor_plum",
  "reverend_green",
  "mrs_peacock",
  "miss_scarlet", 
  "mrs_white"
] as const;

export const weapons = [
  "knife",
  "candlestick",
  "revolver",
  "rope",
  "wrench",
  "lead_pipe"
] as const;

export const gameRooms = [
  "study",
  "hall",
  "lounge",
  "library",
  "billiard_room",
  "dining_room",
  "conservatory",
  "kitchen"
] as const;

// Types for database records
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

// Game data types
export type Suspect = typeof suspects[number];
export type Weapon = typeof weapons[number];
export type GameRoom = typeof gameRooms[number];

export type GameState = {
  solution: {
    suspect: Suspect;
    weapon: Weapon;
    room: GameRoom;
  };
  currentTurn: number;
  gameCards: {
    suspects: Suspect[];
    weapons: Weapon[];
    rooms: GameRoom[];
  };
  playerCards: Record<string, Array<Suspect | Weapon | GameRoom>>;
};

export type Card = {
  type: 'suspect' | 'weapon' | 'room';
  value: Suspect | Weapon | GameRoom;
};

export type Accusation = {
  playerId: string;
  suspect: Suspect;
  weapon: Weapon;
  room: GameRoom;
  isFinal: boolean;
};
