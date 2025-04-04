import axios from 'axios';
import { AppError } from '../middleware/errorHandler.js';


export const getCalls = async (req, res, next) => {
  try {
    const { data } = await axios.get(`${process.env.VAPI_API_URL}/call`, {
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

export const getCallById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data } = await axios.get(`${process.env.VAPI_API_URL}/call/${id}`, {
      headers: {
        'Authorization': process.env.OWN_VAPI_PRIVATE_KEY
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        call: data
      }
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch VAPI call by id', 500));
  }
};

export const getAssistants = async (req, res, next) => {
  try {
    const { data } = await axios.get(`${process.env.VAPI_API_URL}/assistant`, {
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
    const { data } = await axios.get(`${process.env.VAPI_API_URL}/phone-number`, {
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

/* export const createCall = async (req, res, next) => {
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
      "phoneNumberId": process.env.OWN_VAPI_PHONE_NUMBER_ID
    }


    const { data } = await axios.post(`${process.env.VAPI_API_URL}/call/phone`, body, {
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
}; */