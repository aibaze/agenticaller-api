import axios from 'axios';
import { AppError } from '../middleware/errorHandler.js';
const VAPI_URL = 'https://api.vapi.ai'

export const getCalls = async (req, res, next) => {
  try {
    const { data } = await axios.get(`${VAPI_URL}/call`, {
      headers: {
        'Authorization': `Bearer ${req.vapiToken}`
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        calls: data
      }
    });
  } catch (error) {
    console.log("error",error.message)
    next(new AppError(error.message || 'Failed to fetch VAPI calls', 500));
  }
};

export const getAssistants = async (req, res, next) => {
  try {
    const { data } = await axios.get(`${VAPI_URL}/assistant`, {
      headers: {
        'Authorization': `Bearer ${req.vapiToken}`
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        assistants: data
      }
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch VAPI assistants', 500));
  }
}; 