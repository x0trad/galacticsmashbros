import {sqliteTable,text,integer,primaryKey,index,check} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const players=sqliteTable('players',{
 id:text('id').primaryKey(),credits:integer('credits').notNull().default(300),equipped:text('equipped').notNull().default('standard'),totalKills:integer('total_kills').notNull().default(0),runs:integer('runs').notNull().default(0),best:integer('best').notNull().default(0),createdAt:integer('created_at').notNull(),
},t=>[check('credits_nonnegative',sql`${t.credits} >= 0`)]);
export const ownership=sqliteTable('ownership',{playerId:text('player_id').notNull().references(()=>players.id),kit:text('kit').notNull()},t=>[primaryKey({columns:[t.playerId,t.kit]})]);
export const sessions=sqliteTable('sessions',{id:text('id').primaryKey(),playerId:text('player_id').notNull().references(()=>players.id),startedAt:integer('started_at').notNull(),finishedAt:integer('finished_at'),kills:integer('kills'),wave:integer('wave'),score:integer('score'),reward:integer('reward').notNull().default(0)},t=>[index('sessions_player_start').on(t.playerId,t.startedAt)]);
export const ledger=sqliteTable('ledger',{id:text('id').primaryKey(),playerId:text('player_id').notNull().references(()=>players.id),amount:integer('amount').notNull(),reason:text('reason').notNull(),createdAt:integer('created_at').notNull()},t=>[index('ledger_player_time').on(t.playerId,t.createdAt)]);
