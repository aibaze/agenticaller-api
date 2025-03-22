import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/users.js';
import { validateCreateUser, validateUpdateUser } from '../middleware/validateUser.js';
import { verifyGoogleToken} from '../middleware/auth.js';
import Feedback from '../../models/feedback.js';


const router = express.Router();

// GET /api/users - Get all users
router.get('/', getAllUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id',verifyGoogleToken, getUserById);

// POST /api/users - Create new user
router.post('/', createUser);

// PUT /api/users/:id - Update user
router.put('/:id', updateUser);

// DELETE /api/users/:id - Delete user
router.delete('/:id', deleteUser);

// Unprotected endpoint for submitting feedback
router.post('/feedback', async (req, res) => {
  try {
    const { title, email, description } = req.body;
    const feedback = new Feedback({ title, email, description });
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    res.status(400).json({ message: 'Error submitting feedback', error: error.message });
  }
}); 

export default router;
