import { z } from 'zod/v4'

export const contentVisibilitySchema = z.enum(['private', 'organization', 'community', 'marketplace'])

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  durationSeconds: z.number().int().min(1),
  difficultyLevelId: z.string().uuid().optional(),
  creatorNotes: z.string().optional(),
  allDomains: z.boolean().optional(),
  domainIds: z.array(z.string().uuid()).optional(),
  visibility: contentVisibilitySchema.optional(),
})

export const updateExerciseSchema = createExerciseSchema.partial()

export const createSessionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  difficultyLevelId: z.string().uuid().optional(),
  creatorNotes: z.string().optional(),
  allDomains: z.boolean().optional(),
  domainIds: z.array(z.string().uuid()).optional(),
  visibility: contentVisibilitySchema.optional(),
  exercises: z.array(z.object({
    exerciseId: z.string().uuid(),
    position: z.number().int().min(0),
    phaseId: z.string().uuid().optional(),
    restAfterSeconds: z.number().int().min(0).optional(),
    overrideDurationSeconds: z.number().int().min(1).optional(),
    sets: z.number().int().min(1).optional(),
    reps: z.string().max(50).optional(),
    notes: z.string().optional(),
  })).optional(),
})

export const updateSessionSchema = createSessionSchema.partial()

export const createProgramSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  difficultyLevelId: z.string().uuid().optional(),
  creatorNotes: z.string().optional(),
  allDomains: z.boolean().optional(),
  domainIds: z.array(z.string().uuid()).optional(),
  visibility: contentVisibilitySchema.optional(),
  sessions: z.array(z.object({
    sessionId: z.string().uuid(),
    position: z.number().int().min(0),
    dayLabel: z.string().max(100).optional(),
    notes: z.string().optional(),
  })).optional(),
})

export const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: contentVisibilitySchema.optional(),
  domainId: z.string().uuid().optional(),
  difficultyLevelId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'durationSeconds']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})
