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
    console.log("getcalls",error.message, error.name)
    next(new AppError(error.message || 'Failed to fetch VAPI calls', 500));
  }
};

export const getAssistants = async (req, res, next) => {
  try {
    console.log("getassistants",req.vapiToken, VAPI_URL)
    const { data } = await axios.get(`${VAPI_URL}/assistant`, {
      headers: {
        'Authorization': req.userKey
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        assistants: data
      }
    });
  } catch (error) {
    console.log("getassistants",error.message, error.name)

    next(new AppError(error.message || 'Failed to fetch VAPI assistants', 500));
  }
};

export const getPhoneNumbers = async (req, res, next) => {
  try {
    const { data } = await axios.get(`${VAPI_URL}/phone-number`, {
      headers: {
        'Authorization': `Bearer ${req.vapiToken}`
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        phoneNumbers: data
      }
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch VAPI phone numbers', 500));
  }
}; 