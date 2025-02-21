import crypto from 'crypto';

// Use the first 32 bytes of the key
const ENCRYPTION_KEY = process.env.SECRET_ENCRYPTION_KEY 
  ? Buffer.from(process.env.SECRET_ENCRYPTION_KEY).slice(0, 32)
  : null;
const IV_LENGTH = 16;

export const encrypt = (text) => {
  if (!ENCRYPTION_KEY) throw new Error('SECRET_ENCRYPTION_KEY must be defined');
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed');
  }
};

export const decrypt = (text) => {
  if (!ENCRYPTION_KEY) throw new Error('SECRET_ENCRYPTION_KEY must be defined');
  
  try {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed');
  }
}; 