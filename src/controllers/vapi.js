import axios from 'axios';
import { AppError } from '../middleware/errorHandler.js';
import User from '../models/User.js';
import { decrypt } from '../utils/encryption.js';

const VAPI_URL = 'https://api.vapi.ai'
const VAPI_PHONE_NUMBER_ID = '1df2736e-bcf5-4977-82ef-ae1ddae38aa7'

export const getCalls = async (req, res, next) => {
  try {
    const { data } = await axios.get(`${VAPI_URL}/call`, {
      headers: {
        'Authorization':  req.userKey
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        calls: data
      }
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch VAPI calls', 500));
  }
};

export const getAssistants = async (req, res, next) => {
  try {
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

    next(new AppError(error.message || 'Failed to fetch VAPI assistants', 500));
  }
};

export const getPhoneNumbers = async (req, res, next) => {
  try {
    const { data } = await axios.get(`${VAPI_URL}/phone-number`, {
      headers: {
        'Authorization': req.userKey
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

export const createCall = async (req, res, next) => {
  const reqBody = req.body;
  try {
    const leadHasCitizenShip = reqBody.questionnaire[0].answer;
    if(leadHasCitizenShip === 'NO'){
      return res.status(200).json({
        status: 'success',
        data: {
          call: 'Call not created'
        }
      });
    }
    const realStateAgency = await User.findById(reqBody.userId);
    if (!realStateAgency) {
      return next(new AppError('Real State Agency not found', 404));
    }

    const privateKey = decrypt(realStateAgency.vapiKey);
    const body = {
      "assistantId": reqBody.vapiAssistantId,
      "assistantOverrides": {
        "variableValues": {
         "customerName":reqBody.customerName,
         "currentProperty":reqBody.currentProperty,
         "currentPropertyPrice":reqBody.currentPropertyPrice,
         "baseRequierement":reqBody.baseRequierement,
         "alternativeProperty":reqBody.alternativeProperty
        }
      },
      "customer": {
        "number": reqBody.customerPhone
      },
      "phoneNumberId": VAPI_PHONE_NUMBER_ID
    }


    const { data } = await axios.post(`${VAPI_URL}/call/phone`, body, {
      headers: {
        'Authorization': privateKey
      }
    });
    res.status(200).json({
      status: 'success',
      data: { 
        call: data
      }
    });
    console.log('call created successfully',{ call:data });
  } catch (error) {
    if (error.response) {
      console.log('error response', error.response.data);
    }
    next(new AppError(error.message || 'Failed to create VAPI call', 500));
  }
};