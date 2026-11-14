import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { aiSessions, learningCheckpoints, skillAssessments, users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
) {
  try {
    const result = await db
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
) {
  try {
    const [updated] = await db
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

export async function getUserDashboardRecords(uid: string) {
  try {
    const [user] = await db.select().from(users).where(eq(users.uid, uid));
    if (!user) return null;

    const assessments = await db
      .select()
      .from(skillAssessments)
      .where(eq(skillAssessments.userId, user.id))
      .orderBy(desc(skillAssessments.createdAt))
      .limit(20);

    const checkpoints = await db
      .select()
      .from(learningCheckpoints)
      .where(eq(learningCheckpoints.userId, user.id))
      .orderBy(desc(learningCheckpoints.createdAt))
      .limit(30);

    const sessions = await db
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
) {
  try {
    const user = await getOrCreateUser(uid, email);
    const [created] = await db
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
) {
  try {
    const user = await getOrCreateUser(uid, email);
    const [created] = await db
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
