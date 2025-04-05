/**
 * Constants for call execution statuses
 */

// Enum for call execution status
export const CALL_EXECUTION_STATUS = {
  PENDING: 'pending',
  CALL_MADE: 'call-made',
  CALL_ERROR: 'call-error',
  CALL_NOT_TAKEN: 'call-not-taken',
  CALL_COMPLETED: 'call-completed'
};

// Object with descriptions for each status
export const CALL_EXECUTION_STATUS_DESCRIPTION = {
  [CALL_EXECUTION_STATUS.PENDING]: 'Call is scheduled but not yet executed',
  [CALL_EXECUTION_STATUS.CALL_MADE]: 'Call has been initiated but outcome is unknown',
  [CALL_EXECUTION_STATUS.CALL_ERROR]: 'Error occurred during call execution',
  [CALL_EXECUTION_STATUS.CALL_NOT_TAKEN]: 'Call was made but not answered/taken by recipient',
  [CALL_EXECUTION_STATUS.CALL_COMPLETED]: 'Call was completed successfully'
}; 