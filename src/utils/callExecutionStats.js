import CallExecution from '../models/CallExecution.js';
import { CALL_EXECUTION_STATUS } from './constants.js';

/**
 * Get statistics about call executions for a specific time period
 * @param {Object} options - Options for generating statistics
 * @param {Date|string} [options.startDate] - Start date for the statistics period
 * @param {Date|string} [options.endDate] - End date for the statistics period
 * @param {string} [options.userId] - Filter by specific user ID
 * @param {string} [options.reminderId] - Filter by specific reminder ID
 * @returns {Promise<Object>} Statistics object
 */
export const getCallExecutionStats = async (options = {}) => {
  const { startDate, endDate, userId, reminderId } = options;
  
  // Build the query
  const query = {};
  
  // Add date range filters if provided
  if (startDate || endDate) {
    query.date = {};
    
    if (startDate) {
      query.date.$gte = new Date(startDate);
    }
    
    if (endDate) {
      query.date.$lte = new Date(endDate);
    }
  }
  
  // Add userId filter if provided
  if (userId) {
    query.userId = userId;
  }
  
  // Add reminderId filter if provided
  if (reminderId) {
    query.reminderId = reminderId;
  }
  
  // Get total executions
  const totalExecutions = await CallExecution.countDocuments(query);
  
  // Get completed call executions
  const completedExecutions = await CallExecution.countDocuments({
    ...query,
    status: CALL_EXECUTION_STATUS.CALL_COMPLETED
  });
  
  // Get failed executions
  const failedExecutions = await CallExecution.countDocuments({
    ...query,
    status: CALL_EXECUTION_STATUS.CALL_ERROR
  });
  
  // Get pending executions
  const pendingExecutions = await CallExecution.countDocuments({
    ...query,
    status: CALL_EXECUTION_STATUS.PENDING
  });
  
  // Get not taken calls
  const notTakenExecutions = await CallExecution.countDocuments({
    ...query,
    status: CALL_EXECUTION_STATUS.CALL_NOT_TAKEN
  });
  
  // Get most common error messages (top 5)
  const errorAggregation = await CallExecution.aggregate([
    { $match: { ...query, status: CALL_EXECUTION_STATUS.CALL_ERROR, errorMessage: { $ne: null } } },
    { $group: {
        _id: '$errorMessage',
        count: { $sum: 1 }
    }},
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  const commonErrors = errorAggregation.map(item => ({
    message: item._id,
    count: item.count
  }));
  
  return {
    totalExecutions,
    completedExecutions,
    failedExecutions,
    pendingExecutions,
    notTakenExecutions,
    successRate: totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0,
    failureRate: totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0,
    commonErrors,
    timeRange: {
      start: startDate ? new Date(startDate) : null,
      end: endDate ? new Date(endDate) : null
    }
  };
}; 