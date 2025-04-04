import cron from 'node-cron';
import CallReminder from '../models/CallReminder.js';
import axios from 'axios';



const executeCallReminder = async (reminder) => {
  console.log(`Executing reminder: ${reminder.title} (ID: ${reminder._id})`);
  

  const body = {
    "assistantId": process.env.CALL_REMINDER_ASSISTANT_ID,
    "assistantOverrides": {
      "variableValues": {
       "customerName":reminder.calleeName,
       "reminderSummary":reminder.callPurposeSummary,
       "time":`at ${reminder.hour}:${reminder.minutes}`,
       "reminderSentence":reminder.callPurpose,
      }
    },
    "customer": {
      "number": reminder.phoneNumber
    },
    "phoneNumberId": process.env.OWN_VAPI_PHONE_NUMBER_ID
  }

  console.log('Body:', body);


  const { data } = await axios.post(`${process.env.VAPI_API_URL}/call/phone`, body, {
    headers: {
      'Authorization': process.env.OWN_VAPI_PRIVATE_KEY
    }
  });
  return data

};


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
        } catch (error) {
          console.error('Error executing call reminder:', error.message);
          console.error('Error executing call reminder:', error.response.data);
        }
        
        // Update the lastExecuted timestamp
        await CallReminder.findByIdAndUpdate(reminder._id, {
          lastExecuted: now
        });
        
        console.log(`Reminder executed and updated: ${reminder.title}`);
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
 * Schedule jobs
 */
export const scheduleCallReminderJobs = () => {
  // Schedule job to run every minute to check for reminders
  // Format: '* * * * *' = At every minute
  cron.schedule('* * * * *', async () => {
    // Fetch and process call reminders

    await fetchAllCallReminders();
  });
  
  console.log('Call reminder scheduled jobs initialized (running every minute)');
}; 