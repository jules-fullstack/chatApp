import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Standardized error response format
 */
export interface ValidationErrorResponse {
  message: string;
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

/**
 * Generic Zod validation middleware for request body
 */
export const validateBody = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      const response: ValidationErrorResponse = {
        message: 'Validation error',
        errors,
      };

      res.status(400).json(response);
      return;
    }

    // Replace req.body with validated and transformed data
    req.body = result.data;
    next();
  };
};

/**
 * Generic Zod validation middleware for query parameters
 */
export const validateQuery = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      const response: ValidationErrorResponse = {
        message: 'Query validation error',
        errors,
      };

      res.status(400).json(response);
      return;
    }

    // Replace req.query with validated and transformed data
    (req as any).validatedQuery = result.data;
    next();
  };
};

/**
 * Generic Zod validation middleware for route parameters
 */
export const validateParams = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      const response: ValidationErrorResponse = {
        message: 'Parameter validation error',
        errors,
      };

      res.status(400).json(response);
      return;
    }

    // Replace req.params with validated and transformed data
    req.params = result.data as any;
    next();
  };
};

/**
 * Combine multiple validation middleware for complex scenarios
 */
export const validateRequest = <B, Q, P>(options: {
  body?: z.ZodSchema<B>;
  query?: z.ZodSchema<Q>;
  params?: z.ZodSchema<P>;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    // Validate body
    if (options.body) {
      const bodyResult = options.body.safeParse(req.body);
      if (!bodyResult.success) {
        errors.push(
          ...bodyResult.error.issues.map((issue) => ({
            field: `body.${issue.path.join('.')}`,
            message: issue.message,
            code: issue.code,
          })),
        );
      } else {
        req.body = bodyResult.data;
      }
    }

    // Validate query
    if (options.query) {
      const queryResult = options.query.safeParse(req.query);
      if (!queryResult.success) {
        errors.push(
          ...queryResult.error.issues.map((issue) => ({
            field: `query.${issue.path.join('.')}`,
            message: issue.message,
            code: issue.code,
          })),
        );
      } else {
        req.query = queryResult.data as any;
      }
    }

    // Validate params
    if (options.params) {
      const paramsResult = options.params.safeParse(req.params);
      if (!paramsResult.success) {
        errors.push(
          ...paramsResult.error.issues.map((issue) => ({
            field: `params.${issue.path.join('.')}`,
            message: issue.message,
            code: issue.code,
          })),
        );
      } else {
        req.params = paramsResult.data as any;
      }
    }

    if (errors.length > 0) {
      const response: ValidationErrorResponse = {
        message: 'Validation error',
        errors,
      };

      res.status(400).json(response);
      return;
    }

    next();
  };
};

/**
 * Middleware to validate and transform files (for use with multer)
 */
export const validateFiles = (options: {
  required?: boolean;
  maxFiles?: number;
  maxSize?: number;
  allowedMimes?: string[];
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const files = req.files as Express.Multer.File[] | undefined;
    const file = req.file;

    if (options.required && !files && !file) {
      res.status(400).json({
        message: 'Validation error',
        errors: [{ field: 'files', message: 'At least one file is required' }],
      });
      return;
    }

    const filesToValidate = files || (file ? [file] : []);

    if (options.maxFiles && filesToValidate.length > options.maxFiles) {
      res.status(400).json({
        message: 'Validation error',
        errors: [
          {
            field: 'files',
            message: `Maximum ${options.maxFiles} files allowed`,
          },
        ],
      });
      return;
    }

    for (const fileToValidate of filesToValidate) {
      if (options.maxSize && fileToValidate.size > options.maxSize) {
        res.status(400).json({
          message: 'Validation error',
          errors: [
            {
              field: 'files',
              message: `File size must not exceed ${options.maxSize} bytes`,
            },
          ],
        });
        return;
      }

      if (
        options.allowedMimes &&
        !options.allowedMimes.includes(fileToValidate.mimetype)
      ) {
        res.status(400).json({
          message: 'Validation error',
          errors: [
            {
              field: 'files',
              message: `File type ${fileToValidate.mimetype} is not allowed`,
            },
          ],
        });
        return;
      }
    }

    next();
  };
};
