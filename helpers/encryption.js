import crypto from "crypto";
import dotnenv from "dotenv";
dotnenv.config();

export const decryptRequest = (body, privatePem, passphrase) => {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  const privateKey = crypto.createPrivateKey({ key: privatePem, passphrase });
  let decryptedAesKey = null;
  try {
    // decrypt AES key created by client
    decryptedAesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256"
      },
      Buffer.from(encrypted_aes_key, "base64")
    );
  } catch (error) {
    console.error(error);
    /*
    Failed to decrypt. Please verify your private key.
    If you change your public key. You need to return HTTP status code 421 to refresh the public key on the client
    */
    throw new FlowEndpointException(
      421,
      "Failed to decrypt the request. Please verify your private key."
    );
  }

  // decrypt flow data
  const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(initial_vector, "base64");

  const TAG_LENGTH = 16;
  const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
  const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

  const decipher = crypto.createDecipheriv(
    "aes-128-gcm",
    decryptedAesKey,
    initialVectorBuffer
  );
  decipher.setAuthTag(encrypted_flow_data_tag);

  const decryptedJSONString = Buffer.concat([
    decipher.update(encrypted_flow_data_body),
    decipher.final()
  ]).toString("utf-8");

  return {
    decryptedBody: JSON.parse(decryptedJSONString),
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer
  };
};

export const encryptResponse = (
  response,
  aesKeyBuffer,
  initialVectorBuffer
) => {
  // flip initial vector
  const flipped_iv = [];
  for (const pair of initialVectorBuffer.entries()) {
    flipped_iv.push(~pair[1]);
  }

  // encrypt response data
  const cipher = crypto.createCipheriv(
    "aes-128-gcm",
    aesKeyBuffer,
    Buffer.from(flipped_iv)
  );
  return Buffer.concat([
    cipher.update(JSON.stringify(response), "utf-8"),
    cipher.final(),
    cipher.getAuthTag()
  ]).toString("base64");
};

export const FlowEndpointException = class FlowEndpointException extends Error {
  constructor(statusCode, message) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
};

/**
 * Sign a payload and generate a message string with a signature.
 * The payload is Base64-encoded, and the signature is appended to it.
 * @param {Object|string} payload - The message or object to sign.
 * @returns {string} Signed message string in the format: payloadBase64.signature
 */
export function signMessage(payload) {
  const secretKey = process.env.SECRET_KEY;

  // Convert payload to a JSON string if it's an object
  const message =
    typeof payload === "object" ? JSON.stringify(payload) : String(payload);

  // Encode the message in Base64
  const payloadBase64 = Buffer.from(message).toString("base64");

  // Create a signature using HMAC
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(payloadBase64);
  const signature = hmac.digest("base64");

  // Return the signed message
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify the authenticity of a signed message and extract the payload.
 * @param {string} signedMessage - The signed message string in the format: payloadBase64.signature
 * @returns {Object|string} The original payload if the signature is valid.
 * @throws {Error} Throws an error if the signature is invalid.
 */
export function verifyMessage(signedMessage) {
  const secretKey = process.env.SECRET_KEY;

  // Split the signed message into payload and signature
  const [payloadBase64, signature] = signedMessage.split(".");

  if (!payloadBase64 || !signature) {
    return null;
    //throw new Error("Invalid signed message format.");
  }

  // Recreate the HMAC signature from the payload
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(payloadBase64);
  const expectedSignature = hmac.digest("base64");

  // Verify the signature
  if (expectedSignature !== signature) {
    // throw new Error(
    //   "Invalid signature. The message may have been tampered with."
    // );
    return null;
  }

  // Decode the payload from Base64
  const payload = Buffer.from(payloadBase64, "base64").toString("utf8");

  // Parse JSON if possible, otherwise return as a string
  try {
    return JSON.parse(payload);
  } catch {
    return payload; // Return as a string if it's not a JSON object
  }
}

/* global process, console, Buffer */
