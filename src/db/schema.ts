import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  targetCareerId: text('target_career_id').default('fullstack-dev'),
  streakPoints: integer('streak_points').default(0).notNull(),
  streakDays: integer('streak_days').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const skillAssessments = pgTable('skill_assessments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  skillName: text('skill_name').notNull(),
  scorePct: integer('score_pct').notNull(),
  remedialTriggered: boolean('remedial_triggered').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const learningCheckpoints = pgTable('learning_checkpoints', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  moduleId: text('module_id').notNull(),
  skillName: text('skill_name').notNull(),
  completed: boolean('completed').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const aiSessions = pgTable('ai_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  mode: text('mode').notNull(),
  model: text('model').notNull(),
  promptSummary: text('prompt_summary').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  assessments: many(skillAssessments),
  checkpoints: many(learningCheckpoints),
  aiSessions: many(aiSessions),
}));

export const skillAssessmentsRelations = relations(skillAssessments, ({ one }) => ({
  learner: one(users, {
    fields: [skillAssessments.userId],
    references: [users.id],
  }),
}));

export const learningCheckpointsRelations = relations(learningCheckpoints, ({ one }) => ({
  learner: one(users, {
    fields: [learningCheckpoints.userId],
    references: [users.id],
  }),
}));

export const aiSessionsRelations = relations(aiSessions, ({ one }) => ({
  learner: one(users, {
    fields: [aiSessions.userId],
    references: [users.id],
  }),
}));
