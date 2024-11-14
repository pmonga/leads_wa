// whatsappCloudAPI.js
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Factory function to create a WhatsApp Cloud API client.
 * @param {string} phoneNumberId - Your WhatsApp Phone Number ID.
 * @returns {object} - An object with methods to send different types of WhatsApp messages.
 */
function createWhatsAppClient(phoneNumberId) {
  const baseURL = 'https://graph.facebook.com/v16.0/';
  const accessToken = process.env.GRAPH_API_TOKEN;

  if (!accessToken) {
    throw new Error(
      'GRAPH_API_TOKEN is not defined in the environment variables.'
    );
  }

  if (!phoneNumberId) {
    throw new Error('phoneNumberId must be provided.');
  }

  /**
   * Generates the headers required for WhatsApp API requests.
   * @returns {object} - Headers object.
   */
  function getHeaders() {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Internal function to send a message to the WhatsApp API.
   * @param {object} data - The payload to send.
   * @returns {Promise} - Axios response promise.
   */
  async function sendMessage(data) {
    const url = `${baseURL}${phoneNumberId}/messages`;
    try {
      const response = await axios.post(url, data, { headers: getHeaders() });
      return response.data;
    } catch (error) {
      // Enhanced error handling
      if (error.response) {
        // Server responded with a status other than 2xx
        throw new Error(
          `WhatsApp API Error: ${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        );
      } else if (error.request) {
        // No response received
        throw new Error('No response received from WhatsApp API.');
      } else {
        // Other errors
        throw new Error(`Error in sending message: ${error.message}`);
      }
    }
  }

  /**
   * Sends a text message.
   * @param {string} to - Recipient's phone number in international format.
   * @param {Object} messageObject - The text object with message in body. {body: message}. Modify object to as required.
   * @returns {Promise} - Axios response promise.
   */
  async function sendTextMessage(to, messageObject) {
    const data = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: messageObject,
    };
    return sendMessage(data);
  }

  /**
   * Sends an image message.
   * @param {string} to - Recipient's phone number in international format.
   * @param {string} imageUrl - URL of the image to send.
   * @param {string} [caption] - Optional caption for the image.
   * @returns {Promise} - Axios response promise.
   */
  async function sendImageMessage(to, imageUrl, caption = '') {
    const data = {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        caption,
      },
    };
    return sendMessage(data);
  }

  /**
   * Sends a document message.
   * @param {string} to - Recipient's phone number in international format.
   * @param {string} documentUrl - URL of the document to send.
   * @param {string} [filename] - Optional filename for the document.
   * @returns {Promise} - Axios response promise.
   */
  async function sendDocumentMessage(to, documentUrl, filename = '') {
    const data = {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: {
        link: documentUrl,
        filename,
      },
    };
    return sendMessage(data);
  }

  /**
   * Sends a template message.
   * @param {string} to - Recipient's phone number in international format.
   * @param {string} templateName - Name of the pre-approved template.
   * @param {string} languageCode - Language code (e.g., 'en_US').
   * @param {Array<string>} [variables] - Variables to replace in the template.
   * @returns {Promise} - Axios response promise.
   */
  async function sendTemplateMessage(
    to,
    templateName,
    languageCode,
    variables = []
  ) {
    const data = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: variables.map((variable) => ({
              type: 'text',
              text: variable,
            })),
          },
        ],
      },
    };
    return sendMessage(data);
  }

  // Return the methods as an object
  return {
    sendTextMessage,
    sendImageMessage,
    sendDocumentMessage,
    sendTemplateMessage,
  };
}

export default createWhatsAppClient;
