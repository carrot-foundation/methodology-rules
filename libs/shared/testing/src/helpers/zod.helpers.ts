import type { z } from 'zod';

export const formatZodError = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    message: issue.message,
    path: issue.path.map(String).join('.') || '$input',
  }));
