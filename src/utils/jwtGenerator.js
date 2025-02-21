import jwt from 'jsonwebtoken';

function generateJWT(payload, privateKey, options) {
  try {
    // Validate inputs
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be a valid object');
    }
    if (!privateKey || typeof privateKey !== 'string') {
      throw new Error('Private key must be a valid string');
    }
    if (!options || typeof options !== 'object') {
      throw new Error('Options must be a valid object');
    }

    // Generate the JWT
    const token = jwt.sign(payload, privateKey, options);
    return token;
  } catch (error) {
    console.error('Error generating JWT:', error.message);
    throw error;
  }
}

export default generateJWT; 