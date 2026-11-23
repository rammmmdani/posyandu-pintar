import { ApiError } from '../utils/ApiError.js';

// validate(skema)           -> memeriksa req.body
// validate(skema, 'query')  -> memeriksa req.query, hasil di req.validatedQuery
export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new ApiError(400, 'VALIDATION_ERROR', 'Data tidak valid', errors));
    }
    if (source === 'body') req.body = result.data;
    else req.validatedQuery = result.data;
    next();
  };