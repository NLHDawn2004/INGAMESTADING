import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const studio = sqliteTable('studio', { id:text('id').primaryKey(), state:text('state').notNull(), revision:integer('revision').notNull(), history:text('history').notNull(), overlayToken:text('overlay_token').notNull() });
export const authCredentials = sqliteTable('auth_credentials', { id:text('id').primaryKey(), passwordHash:text('password_hash').notNull() });
export const authSessions = sqliteTable('auth_sessions', { tokenHash:text('token_hash').primaryKey(), expiresAt:integer('expires_at').notNull() });
export const authLimits = sqliteTable('auth_limits', { id:text('id').primaryKey(), attempts:integer('attempts').notNull(), resetAt:integer('reset_at').notNull() });

export const liveScoreboardBridge=sqliteTable('live_scoreboard_bridge',{id:text('id').primaryKey(),tokenHash:text('token_hash'),sessionId:text('session_id'),configId:text('config_id'),matchId:text('match_id').notNull().default(''),lastSequence:integer('last_sequence').notNull().default(-1),snapshot:text('snapshot'),lastSeenAt:integer('last_seen_at').notNull().default(0),sampleAt:integer('sample_at').notNull().default(0),receivedAt:integer('received_at').notNull().default(0),sourceStatus:text('source_status').notNull().default('waiting'),sourceError:text('source_error').notNull().default(''),diagnostic:text('diagnostic')});
