import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find();
  res.status(200).json(users);
});

export const getUserById = asyncHandler(async (req, res, next) => {
  const isEmail =
  req.params.id.includes("@") || req.params.id.includes(".com");
const query = isEmail
  ? { email: req.params.id }
  : { _id: new ObjectId(req.params.id) };  
  const user = await User.findOne(query);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json(user);
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json({ 
    message: 'User created successfully',
    user
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json(user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({ 
    message: 'User deleted successfully'
  });
});
