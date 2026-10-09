/**
 * Voice of Gudalur — Express/Connect type augmentation.
 * Lets `req.user` be set by auth middleware and read in route handlers
 * without `any` casts.
 */
import 'express';
import type { SessionUser } from '../middleware/auth';

declare module 'express' {
  interface Request {
    user?: SessionUser;
  }
}
