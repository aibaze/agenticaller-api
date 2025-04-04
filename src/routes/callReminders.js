import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import CallReminder from '../models/CallReminder.js';
import { verifyGoogleToken } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();


// Execute a call reminder
const executeCallReminder = async (reminder) => {
  console.log(`Executing reminder: ${reminder.title} (ID: ${reminder._id})`);
  
  const body = {
    "assistantId": process.env.CALL_REMINDER_ASSISTANT_ID,
    "assistantOverrides": {
      "variableValues": {
       "customerName": reminder.calleeName,
       "reminderSummary": reminder.callPurposeSummary,
       "time": reminder.time,
       "reminderSentence": reminder.callPurpose,
      }
    },
    "customer": {
      "number": reminder.phoneNumber?.replace(/ /g, '')
    },
    "phoneNumberId": process.env.OWN_VAPI_PHONE_NUMBER_ID
  }

  const { data } = await axios.post(`${process.env.VAPI_API_URL}/call/phone`, body, {
    headers: {
      'Authorization': process.env.OWN_VAPI_PHONE_NUMBER_ID
    }
  });
  return data;
};

// Middleware to protect routes
//router.use(verifyGoogleToken);

// Get all call reminders
router.get('/', asyncHandler(async (req, res) => {
  const callReminders = await CallReminder.find({ isActive: true });
  res.status(200).json({
    status: 'success',
    results: callReminders.length,
    data: {
      callReminders
    }
  });
}));

// Get upcoming reminders for a specific time period (defaults to 24 hours)
router.get('/upcoming', asyncHandler(async (req, res) => {
  // Get time period from query params (in hours, default to 24)
  const hours = parseInt(req.query.hours) || 24;
  
  // Calculate time range
  const now = new Date();
  const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
  
  // Find active reminders with specific time filtering logic
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Create a time-ordered set of hour:minute pairs to check
  const timeSlots = [];
  let checkTime = new Date(now);
  
  // Generate all time slots between now and endTime
  while (checkTime <= endTime) {
    timeSlots.push({
      hour: checkTime.getHours().toString(),
      minute: checkTime.getMinutes().toString()
    });
    // Advance by 1 minute
    checkTime = new Date(checkTime.getTime() + 60000);
  }
  
  // Extract unique hours to check (for backwards compatibility)
  const hoursToCheck = [...new Set(timeSlots.map(slot => slot.hour))];
  
  // Find all reminders with matching hours
  const callReminders = await CallReminder.find({ 
    isActive: true,
    hour: { $in: hoursToCheck }
  });
  
  // Further filter reminders based on time windows and recurrence rules
  const upcomingReminders = callReminders.filter(reminder => {
    // Get the time parts
    const reminderHour = parseInt(reminder.hour);
    const reminderMinute = parseInt(reminder.minutes);
    
    // Check if the reminder time falls within our window
    const reminderTimeToday = new Date(now);
    reminderTimeToday.setHours(reminderHour, reminderMinute, 0, 0);
    
    // If reminder time today is in the past, check if it's for tomorrow
    if (reminderTimeToday < now) {
      reminderTimeToday.setDate(reminderTimeToday.getDate() + 1);
    }
    
    // Check if the reminder time is within our window
    const isInTimeWindow = reminderTimeToday <= endTime;
    if (!isInTimeWindow) {
      return false;
    }
    
    // If it has never been executed, it should run
    if (!reminder.lastExecuted) {
      return true;
    }
    
    const lastExec = new Date(reminder.lastExecuted);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (reminder.recurrence) {
      case 'daily':
        // For daily, check if it was executed today
        const lastExecDay = new Date(lastExec.getFullYear(), lastExec.getMonth(), lastExec.getDate());
        return lastExecDay < today;
        
      case 'weekly':
        // For weekly, check if it was executed in the last 7 days
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return lastExec <= oneWeekAgo;
        
      case 'monthly':
        // For monthly, check if it was executed in the current month
        const lastExecMonth = lastExec.getMonth();
        const lastExecYear = lastExec.getFullYear();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Execute if it's a different month or year
        return lastExecMonth !== currentMonth || lastExecYear !== currentYear;
        
      default:
        // For any other case, treat as a one-time reminder that should only run once
        return false;
    }
  });
  
  // Sort the reminders by time
  upcomingReminders.sort((a, b) => {
    const aTime = new Date();
    aTime.setHours(parseInt(a.hour), parseInt(a.minutes), 0, 0);
    if (aTime < now) aTime.setDate(aTime.getDate() + 1);
    
    const bTime = new Date();
    bTime.setHours(parseInt(b.hour), parseInt(b.minutes), 0, 0);
    if (bTime < now) bTime.setDate(bTime.getDate() + 1);
    
    return aTime - bTime;
  });
  
  res.status(200).json({
    status: 'success',
    results: upcomingReminders.length,
    timeWindow: `${hours} hours`,
    data: {
      reminders: upcomingReminders
    }
  });
}));

// Get a specific call reminder
router.get('/user/:id', asyncHandler(async (req, res) => {
  const callReminders = await CallReminder.find({ userId: req.params.id });
  
  if (!callReminders.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'Create a call reminder first'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      callReminders
    }
  });
}));

// Create a new call reminder
router.post('/', asyncHandler(async (req, res) => {
  const {
    title,
    internalLabel,
    callPurpose,
    calleeName,
    callPurposeSummary,
    recurrence,
    phoneNumber,
    time,
    userId
  } = req.body;

  if(!userId) {
    return res.status(400).json({
      status: 'fail',
      message: 'User ID is required'
    });
  }
  
  // Parse hours and minutes from ISO string time
  const timeDate = new Date(time);
  const hour = timeDate.getHours().toString();
  const minutes = timeDate.getMinutes().toString();
  
  const newCallReminder = await CallReminder.create({
    title,
    internalLabel,
    callPurpose,
    calleeName,
    callPurposeSummary,
    recurrence,
    phoneNumber,
    time,
    hour,
    minutes,
    lastExecuted: null, // Initialize lastExecuted as null
    userId
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      callReminder: newCallReminder
    }
  });
}));

// Update a call reminder
router.put('/:id', asyncHandler(async (req, res) => {
  // Create a copy of the request body to work with
  const updateData = { ...req.body };
  
  // If time is being updated, update the hour and minutes fields as well
  if (updateData.time) {
    const timeDate = new Date(updateData.time);
    updateData.hour = timeDate.getHours().toString();
    updateData.minutes = timeDate.getMinutes().toString();
  }
  
  const callReminder = await CallReminder.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!callReminder) {
    return res.status(404).json({
      status: 'fail',
      message: 'Call reminder not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      callReminder
    }
  });
}));

// Delete a call reminder (soft delete by setting isActive to false)
router.delete('/:id', asyncHandler(async (req, res) => {
  const callReminder = await CallReminder.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  
  if (!callReminder) {
    return res.status(404).json({
      status: 'fail',
      message: 'Call reminder not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Call reminder deleted successfully'
  });
}));

// Manually trigger a reminder execution
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const callReminder = await CallReminder.findById(req.params.id);
  
  if (!callReminder) {
    return res.status(404).json({
      status: 'fail',
      message: 'Call reminder not found'
    });
  }
  
  if (!callReminder.isActive) {
    return res.status(400).json({
      status: 'fail',
      message: 'Cannot execute an inactive reminder'
    });
  }
  
  // Execute the call
  try {
    const callResult = await executeCallReminder(callReminder);
    
    // Update the lastExecuted timestamp
    callReminder.lastExecuted = new Date();
    await callReminder.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Call reminder executed successfully',
      data: {
        callReminder,
        callResult
      }
    });
  } catch (error) {
    console.error('Error executing call reminder:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to execute call reminder',
      error: error.message
    });
  }
}));

export default router; 