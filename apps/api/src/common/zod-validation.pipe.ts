import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

export interface ValidationIssue {
  path: string;
  message: string;
}

export function toValidationIssues(error: z.ZodError, pathPrefix?: string): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: [pathPrefix, ...issue.path].filter((part) => part !== undefined).join('.'),
    message: issue.message,
  }));
}

/** 400 with a flat `issues` list the web form can map straight onto its fields. */
export function validationFailed(issues: ValidationIssue[]) {
  return new BadRequestException({ statusCode: 400, message: 'Validation failed', issues });
}

/** Validates with a schema from @vigil/shared, so client and server rules are identical. */
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) throw validationFailed(toValidationIssues(result.error));
    return result.data;
  }
}
