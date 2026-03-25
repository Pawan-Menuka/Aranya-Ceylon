import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';

// Validates req.body against a Zod schema
// Returns 400 with field-level errors if validation fails
export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            return res.status(400).json({ error: 'Validation failed', errors });
        }

        // Replace req.body with the parsed + coerced data
        req.body = result.data;
        next();
    };
}