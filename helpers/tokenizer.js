import { createHmac } from 'crypto';
import dotnenv from 'dotenv';
dotnenv.config();

// Function to generate HMAC signatures
export default function generateToken(payload) {
  // Ensure the secret is provided in the environment variables
  const secret = process.env.SECRET_KEY;
  if (!secret) {
    throw new Error('SECRET_KEY is not defined in the environment variables.');
  }

  // Generate the HMAC in Base64 format
  const token = createHmac('sha256', secret).update(payload).digest('base64');

  //   // Generate the HMAC in Hexadecimal format
  //   const hmacHex = createHmac('sha256', secret)
  //     .update(payload)
  //     .digest('hex');

  // Return both signatures
  return token;
}
