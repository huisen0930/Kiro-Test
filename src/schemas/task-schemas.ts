import { z } from "zod";

/**
 * Title is trimmed first, then required to be 1–200 characters. Trimming before
 * validation means a whitespace-only title is rejected (requirements 1.2, 1.3).
 */
const titleSchema = z
  .string({ required_error: "title is required" })
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "title must not be empty")
      .max(200, "title must be at most 200 characters"),
  );

const tagsSchema = z.array(z.string()).optional();

export const createTaskBodySchema = z.object({
  title: titleSchema,
  tags: tagsSchema,
});

export const updateTaskBodySchema = z
  .object({
    title: titleSchema.optional(),
    tags: tagsSchema,
  })
  .refine((body) => body.title !== undefined || body.tags !== undefined, {
    message: "provide at least one of: title, tags",
  });

export const listTasksQuerySchema = z.object({
  status: z.enum(["open", "done"]).optional(),
  tag: z.string().min(1).optional(),
});

export const taskIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
