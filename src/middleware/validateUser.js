import validator from 'validator';

export const validateCreateUser = (req, res, next) => {
  const { name } = req.body;
  const errors = [];

  // Validate name
  if (!name) {
    errors.push('Name is required');
  } else if (!validator.isLength(name, { min: 2, max: 50 })) {
    errors.push('Name must be between 2 and 50 characters');
  } else if (!validator.matches(name, /^[a-zA-Z0-9\s-_]+$/)) {
    errors.push('Name contains invalid characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

export const validateUpdateUser = (req, res, next) => {
  const { name } = req.body;
  const errors = [];

  // Only validate if name is provided (since it's an update)
  if (name !== undefined) {
    if (!validator.isLength(name, { min: 2, max: 50 })) {
      errors.push('Name must be between 2 and 50 characters');
    } else if (!validator.matches(name, /^[a-zA-Z0-9\s-_]+$/)) {
      errors.push('Name contains invalid characters');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
}; 