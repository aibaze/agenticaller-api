import cron from 'node-cron';
import CallReminder from '../models/CallReminder.js';
import CallExecution from '../models/CallExecution.js';
import axios from 'axios';
import { CALL_EXECUTION_STATUS } from '../utils/constants.js';



const executeCallReminder = async (reminder) => {
  console.log(`Executing reminder: ${reminder.title} (ID: ${reminder._id})`);
  
  // Create a pending execution record
  const execution = await CallExecution.create({
    reminderId: reminder._id,
    userId: reminder.userId,
    status: CALL_EXECUTION_STATUS.PENDING,
    reminderData: {
      title: reminder.title,
      phoneNumber: reminder.phoneNumber,
      recurrence: reminder.recurrence,
      hour: reminder.hour,
      minutes: reminder.minutes
    }
  });
  

  try {
    const body = {
      "assistantId": process.env.CALL_REMINDER_ASSISTANT_ID,
      "assistantOverrides": {
        "variableValues": {
         "customerName": reminder.calleeName,
         "reminderSummary": reminder.callPurposeSummary,
         "time": `at ${reminder.hour} ${reminder.minutes}`,
         "reminderSentence": reminder.callPurpose,
        }
      },
      "customer": {
        "number": reminder.phoneNumber
      },
      "phoneNumberId": process.env.OWN_VAPI_PHONE_NUMBER_ID
    }
  
  
    const { data } = await axios.post(`${process.env.VAPI_API_URL}/call/phone`, body, {
      headers: {
        'Authorization': process.env.OWN_VAPI_PRIVATE_KEY
      }
    });
    

    // Update execution record with success
    await CallExecution.findByIdAndUpdate(execution._id, {
      status: CALL_EXECUTION_STATUS.CALL_MADE,
      callId: data.id ,
    });

    return data;
  } catch (error) {
    
    // Update execution record with error information
    await CallExecution.findByIdAndUpdate(execution._id, {
      status: CALL_EXECUTION_STATUS.CALL_ERROR,
      error: true,
      callId:  CALL_EXECUTION_STATUS.CALL_ERROR,
      errorMessage: error.message || 'Unknown error',
    });
    
    throw error;
  }
};


/**
 * Fetch all call reminders from the database and execute those that are due
 * 
 * Handles different recurrence types:
 * - one-time: Executes only once at scheduled time, then becomes inactive
 * - daily: Executes once per day at scheduled time
 * - weekly: Executes once per week at scheduled time
 * - monthly: Executes once per month at scheduled time
 */
export const fetchAllCallReminders = async () => {
  try {
    console.log('Fetching call reminders - Scheduled job started at:', new Date().toISOString());
    
    // Get all active call reminders from the database

    // Get current hour and minutes
    const now = new Date();
    const currentHour = now.getHours().toString();
    const currentMinutes = now.getMinutes().toString();
    
    console.log(`Current time: ${currentHour}:${currentMinutes}`);
    
    // Find reminders that should execute at this time (hour and minute match)
    const callReminders = await CallReminder.find({ 
      isActive: true, 
      hour: currentHour,
      minutes: currentMinutes
    });

    // Log the query criteria and results
    console.log(`Searching for reminders with hour: ${currentHour} and minutes: ${currentMinutes}`);
    console.log(`Found ${callReminders.length} matching reminders`);

    //if callReminders.length is 0 then return
    if (callReminders.length === 0) {
      console.log('No active call reminders found for current time');
      return;
    }

    //  recurrence can be daily, weekly, Monthly
    //  use lastExecuted to check if the reminder has been executed
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Process each reminder based on its recurrence pattern
    for (const reminder of callReminders) {
      let shouldExecute = false;
      
      // If never executed before, execute it regardless of recurrence type
      if (!reminder.lastExecuted) {
        console.log(`Reminder ${reminder.title} has never been executed before - will execute`);
        shouldExecute = true;
      } else {
        const lastExec = new Date(reminder.lastExecuted);
        console.log(`Reminder ${reminder.title} was last executed on ${lastExec}`);
        
        // If it's a one-time reminder that has been executed before,
        // it should never execute again and should be inactive
        if (reminder.recurrence === 'one-time') {
          console.log(`One-time reminder ${reminder.title} already executed on ${lastExec} - will not execute again`);
          // Double-check that isActive is set to false (it should be, but just in case)
          if (reminder.isActive) {
            console.log(`Warning: One-time reminder ${reminder.title} was still active after execution. Setting to inactive.`);
            await CallReminder.findByIdAndUpdate(reminder._id, { isActive: false });
          }
          shouldExecute = false;
        } else {
          // For recurring reminders, check based on recurrence pattern
          switch (reminder.recurrence) {
            case 'daily':
              // For daily, check if it was executed today
              const lastExecDay = new Date(lastExec.getFullYear(), lastExec.getMonth(), lastExec.getDate());
              shouldExecute = lastExecDay < today;
              break;
              
            case 'weekly':
              // For weekly, check if it was executed in the last 7 days
              const oneWeekAgo = new Date(today);
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              shouldExecute = lastExec <= oneWeekAgo;
              break;
              
            case 'monthly':
              // For monthly, check if it was executed in the current month
              const lastExecMonth = lastExec.getMonth();
              const lastExecYear = lastExec.getFullYear();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              
              // Execute if it's a different month or year
              shouldExecute = lastExecMonth !== currentMonth || lastExecYear !== currentYear;
              break;
              
            default:
              // For any other case (including undefined), treat as a one-time reminder
              shouldExecute = false;
              break;
          }
        }
      }

      console.log(`Reminder ${reminder.title} should execute: ${shouldExecute}, reminder recurrence: ${reminder.recurrence}, last executed: ${reminder.lastExecuted}`);
      
      if (shouldExecute) {
        
        // Here you would implement the actual reminder execution logic
        // For example, sending notifications, making API calls, etc.
        try {
          const call = await executeCallReminder(reminder);
          console.log('Call execution result:', call);
          
          // Update the lastExecuted timestamp and increment timesExecuted
          const updateData = {
            lastExecuted: now,
            timesExecuted: reminder.timesExecuted  + 1
          };
          
          // If this is a one-time reminder, also set isActive to false
          if (reminder.recurrence === 'one-time') {
            updateData.isActive = false;
            console.log(`One-time reminder ${reminder.title} set to inactive after execution`);
          }
          
          await CallReminder.findByIdAndUpdate(reminder._id, updateData);
          
          console.log(`Reminder executed and updated: ${reminder.title}`);
        } catch (error) {
          // Update the reminder with the error
          await CallReminder.findByIdAndUpdate(reminder._id, {
            timesExecuted: reminder.timesExecuted  + 1,
            callsError: reminder.callsError + 1
          });
          console.error('Error executing call reminder:', error.message);
          if (error.response && error.response.data) {
            console.error('Error executing call reminder:', error.response.data);
          }
        }
      } else {
        console.log(`Skipping reminder: ${reminder.title} (already executed for this recurrence period, LAST EXECUTED: ${reminder.lastExecuted}, RECURRENCE: ${reminder.recurrence})`);
      }
    }
    
    console.log(`Processed ${callReminders.length} active call reminders`);
    
    return callReminders;
  } catch (error) {
    console.error('Error in fetchAllCallReminders scheduled job:', error);
  }
  console.log('Fetching call reminders - Scheduled job completed at:', new Date().toISOString());
};

/**
 * Update call execution statuses by fetching their status from the API
 * Runs every hour to check on calls that have been initiated
 */
export const enrichCallExecutionStatuses = async () => {
  try {
    console.log('Updating call execution statuses - Scheduled job started at:', new Date().toISOString());
    
    // Find all call executions with 'call-made' status
    const callExecutions = await CallExecution.find({ status: CALL_EXECUTION_STATUS.CALL_MADE });
    
    console.log(`Found ${callExecutions.length} call executions with '${CALL_EXECUTION_STATUS.CALL_MADE}' status`);
    
    for (const execution of callExecutions) {
      try {
        // Skip if no valid callId
        if (!execution.callId || execution.callId ===  CALL_EXECUTION_STATUS.CALL_ERROR) {
          console.log(`Skipping execution ${execution._id} - Invalid call ID: ${execution.callId}`);
          continue;
        }
        
        console.log(`Processing call execution: ${execution._id}, Call ID: ${execution.callId}`);
        
        // Fetch call details from VAPI API
        const { data } = await axios.get(`${process.env.VAPI_API_URL}/call/${execution.callId}`, {
          headers: {
            'Authorization': process.env.OWN_VAPI_PRIVATE_KEY
          }
        });
        const currentReminder = await CallReminder.findById(execution.reminderId);

        
        // If call doesn't have a startedAt timestamp, it wasn't taken
        const didntStarted = !data.startedAt || !data.analysis?.summary 
        const falledIntoVoicemail = !data.transcript?.toLowerCase().includes("Hi there")
        if (didntStarted || falledIntoVoicemail) {
          console.log(`Call ${execution.callId} was not taken`);
          
          await CallExecution.findByIdAndUpdate(execution._id, {
            callTaken: false,
            status: CALL_EXECUTION_STATUS.CALL_NOT_TAKEN
          });
          await CallReminder.findByIdAndUpdate(execution.reminderId, {
            callsNotTaken: currentReminder.callsNotTaken + 1
          });
          
          continue;
        }

        
        
        // Calculate call duration in seconds
        let callDuration = null;
        if (data.startedAt && data.endedAt) {
          const startTime = new Date(data.startedAt);
          const endTime = new Date(data.endedAt);
          callDuration = Math.floor((endTime - startTime) / 1000); // Duration in seconds
        }
        
        // Update execution with call details
        await CallExecution.findByIdAndUpdate(execution._id, {
          callTaken: true,
          status: CALL_EXECUTION_STATUS.CALL_TAKEN,
          callSummary: data.analysis?.summary || null,
          callDuration: callDuration,
          callCost: data.cost || null,
          endedReason: data.endedReason || null
        });
        await CallReminder.findByIdAndUpdate(execution.reminderId, {
          callsTaken: currentReminder.callsTaken + 1
        });
        console.log(`Updated call execution ${execution._id} with completed status`);
        
      } catch (error) {
        console.error(`Error updating call execution ${execution._id}:`, error.message);
        if (error.response && error.response.data) {
          console.error('API Error Details:', error.response.data);
        }
      }
    }
    
    console.log('Updating call execution statuses - Scheduled job completed at:', new Date().toISOString());
  } catch (error) {
    console.error('Error in enrichCallExecutionStatuses scheduled job:', error);
  }
};

/**
 * Schedule jobs
 */
export const scheduleCallReminderJobs = () => {
  // Schedule job to run every minute to check for reminders
  // Format: '* * * * *' = At every minute
  cron.schedule('* * * * *', async () => {
    // Fetch and process call reminders
    await fetchAllCallReminders();
  });
  
  // Schedule job to run every hour to enrich call execution statuses
  // Format: '0 * * * *' = At minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    // Update call execution statuses
    await enrichCallExecutionStatuses();
  });
  
  console.log('Call reminder scheduled jobs initialized (reminders: every minute, status updates: every hour)');
}; 