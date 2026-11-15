import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { aiSessions, learningCheckpoints, skillAssessments, users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  database = db,
) {
  try {
    const result = await database
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database getOrCreateUser failed:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function updateUserCareerSnapshot(
  uid: string,
  params: {
    displayName?: string;
    targetCareerId?: string;
    streakPoints?: number;
    streakDays?: number;
  },
  database = db,
) {
  try {
    const [updated] = await database
      .update(users)
      .set({
        ...(params.displayName !== undefined ? { displayName: params.displayName } : {}),
        ...(params.targetCareerId !== undefined ? { targetCareerId: params.targetCareerId } : {}),
        ...(params.streakPoints !== undefined ? { streakPoints: params.streakPoints } : {}),
        ...(params.streakDays !== undefined ? { streakDays: params.streakDays } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return updated || null;
  } catch (error) {
    console.error('Database updateUserCareerSnapshot failed:', error);
    throw new Error('Failed to update learner snapshot.', { cause: error });
  }
}

export async function getUserDashboardRecords(uid: string, database = db) {
  try {
    const [user] = await database.select().from(users).where(eq(users.uid, uid));
    if (!user) return null;

    const assessments = await database
      .select()
      .from(skillAssessments)
      .where(eq(skillAssessments.userId, user.id))
      .orderBy(desc(skillAssessments.createdAt))
      .limit(20);

    const checkpoints = await database
      .select()
      .from(learningCheckpoints)
      .where(eq(learningCheckpoints.userId, user.id))
      .orderBy(desc(learningCheckpoints.createdAt))
      .limit(30);

    const sessions = await database
      .select()
      .from(aiSessions)
      .where(eq(aiSessions.userId, user.id))
      .orderBy(desc(aiSessions.createdAt))
      .limit(15);

    return { user, assessments, checkpoints, sessions };
  } catch (error) {
    console.error('Database getUserDashboardRecords failed:', error);
    throw new Error('Failed to load learner progress records.', { cause: error });
  }
}

export async function recordSqlAssessment(
  uid: string,
  email: string,
  input: {
    skillName: string;
    scorePct: number;
    remedialTriggered: boolean;
    notes?: string;
  },
  database = db,
) {
  try {
    const user = await getOrCreateUser(uid, email, undefined, database);
    const [created] = await database
      .insert(skillAssessments)
      .values({
        userId: user.id,
        skillName: input.skillName,
        scorePct: Math.max(0, Math.min(100, Math.round(input.scorePct))),
        remedialTriggered: input.remedialTriggered,
        notes: input.notes || null,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database recordSqlAssessment failed:', error);
    throw new Error('Failed to save assessment record.', { cause: error });
  }
}

export async function recordSqlAiSession(
  uid: string,
  email: string,
  input: { mode: string; model: string; promptSummary: string },
  database = db,
) {
  try {
    const user = await getOrCreateUser(uid, email, undefined, database);
    const [created] = await database
      .insert(aiSessions)
      .values({
        userId: user.id,
        mode: input.mode,
        model: input.model,
        promptSummary: input.promptSummary.slice(0, 200),
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database recordSqlAiSession failed:', error);
    throw new Error('Failed to log AI study session.', { cause: error });
  }
}
