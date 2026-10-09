/**
 * Voice of Gudalur — Lightweight request-body validation middleware.
 *
 * Provides a single, minimal validation utility (no extra heavyweight
 * dependency). Each POST/PATCH handler composes a small schema that
 * enforces:
 *   - required fields present
 *   - string length bounds (min/max)
 *   - number bounds
 *   - array length limits
 *   - enum membership
 *
 * Malformed input → 400 with a descriptive error.
 * Validation errors NEVER become 500s.
 * Sensitive values (passwords, tokens, Aadhaar) are never echoed back.
 */
import type { Request, Response, NextFunction } from 'express';

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  min?: number;       // string min length | number minimum | array min length
  max?: number;       // string max length | number maximum | array max length
  enum?: string[];    // allowed values for strings
}

export type ValidationSchema = Record<string, ValidationRule>;

/** Extract the value at a dotted path from an object (e.g. "address.city"). */
function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Validate `req.body` against a schema. On failure, responds 400 and returns
 * false (the caller should `return` after invoking validateBody).
 * On success, calls next().
 *
 * Usage:
 *   router.post('/login', validateBody({
 *     gudalurId: { type: 'string', required: true, max: 32 },
 *     password:  { type: 'string', required: true, min: 1, max: 256 },
 *   }), handler);
 */
export function validateBody(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const [path, rule] of Object.entries(schema)) {
      const value = getPath(req.body, path);
      const isPresent = value !== undefined && value !== null && value !== '';

      if (!isPresent) {
        if (rule.required) {
          errors.push(`Missing required field: ${path}`);
        }
        continue;
      }

      // Type checks
      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${path} must be a string`);
        continue;
      }
      if (rule.type === 'number' && typeof value !== 'number') {
        errors.push(`${path} must be a number`);
        continue;
      }
      if (rule.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${path} must be a boolean`);
        continue;
      }
      if (rule.type === 'array' && !Array.isArray(value)) {
        errors.push(`${path} must be an array`);
        continue;
      }

      // Length / bound checks (skip for absent optional values)
      if (typeof value === 'string') {
        if (rule.min !== undefined && value.length < rule.min) {
          errors.push(`${path} must be at least ${rule.min} characters`);
        }
        if (rule.max !== undefined && value.length > rule.max) {
          errors.push(`${path} must be at most ${rule.max} characters`);
        }
        if (rule.enum && !rule.enum.includes(value)) {
          errors.push(`${path} must be one of: ${rule.enum.join(', ')}`);
        }
      }

      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${path} must be >= ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${path} must be <= ${rule.max}`);
        }
      }

      if (Array.isArray(value)) {
        if (rule.min !== undefined && value.length < rule.min) {
          errors.push(`${path} must have at least ${rule.min} items`);
        }
        if (rule.max !== undefined && value.length > rule.max) {
          errors.push(`${path} must have at most ${rule.max} items`);
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }
    next();
  };
}

/**
 * Enforce a maximum JSON body size at the route level (defense in depth on top
 * of express.json's limit). Mount once per router or per route.
 * Usage: app.use('/api', bodySizeLimit(1_000_000))
 */
export function bodySizeLimit(maxBytes: number) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const len = req.headers['content-length'];
    if (len && Number(len) > maxBytes) {
      (req as any).body = null;
      return next();
    }
    next();
  };
}
