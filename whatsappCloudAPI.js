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

  // Template for the base data object
  const baseDataTemplate = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
  };

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
      if (error.response) {
        throw new Error(
          `WhatsApp API Error: ${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        );
      } else if (error.request) {
        throw new Error('No response received from WhatsApp API.');
      } else {
        throw new Error(`Error in sending message: ${error.message}`);
      }
    }
  }

  /**
   * Sends a text message.
   * @param {string} to - Recipient's phone number in international format.
   * @param {object} message - Message object with `body` and other properties.
   * @returns {Promise} - Axios response promise.
   */
  async function sendTextMessage(to, message) {
    const data = {
      ...baseDataTemplate,
      to,
      type: 'text',
      text: message, // message object expected to contain { body: 'your message' }
    };
    return sendMessage(data);
  }

  /**
   * Sends an image message.
   * @param {string} to - Recipient's phone number in international format.
   * @param {object} message - Message object with `link` and optional `caption`.
   * @returns {Promise} - Axios response promise.
   */
  async function sendImageMessage(to, message) {
    const data = {
      ...baseDataTemplate,
      to,
      type: 'image',
      image: message, // message object expected to contain { link: 'imageUrl', caption: 'optional caption' }
    };
    return sendMessage(data);
  }

  /**
   * Sends a document message.
   * @param {string} to - Recipient's phone number in international format.
   * @param {object} message - Message object with `link` and optional `filename`.
   * @returns {Promise} - Axios response promise.
   */
  async function sendDocumentMessage(to, message) {
    const data = {
      ...baseDataTemplate,
      to,
      type: 'document',
      document: message, // message object expected to contain { link: 'documentUrl', filename: 'optional filename' }
    };
    return sendMessage(data);
  }

  /**
   * Sends a template message.
   * @param {string} to - Recipient's phone number in international format.
   * @param {object} message - Message object with `name`, `language`, and optional `components`.
   * @returns {Promise} - Axios response promise.
   */
  async function sendTemplateMessage(to, message) {
    const data = {
      ...baseDataTemplate,
      to,
      type: 'template',
      template: message, // message object expected to contain { name: 'templateName', language: { code: 'languageCode' }, components: 'optional components' }
    };
    return sendMessage(data);
  }
  async function sendFlowMessage(to, layout, params) {
    const data = {
      recipient_type: 'individual',
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'flow',
        ...layout,
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            // flow_token: 'AQAAAAACS5FpgQ_cAAAAAD0QI3s.',
            // flow_id: '1760272798116365', //Lead Sign Up

            // flow_cta: 'Book!',
            // flow_action: 'navigate',
            // flow_action_payload: {
            //   screen: '<SCREEN_NAME>',
            //   data: {
            //     product_name: 'name',
            //     product_description: 'description',
            //     product_price: 100,
            //   },
            // },
            ...params,
          },
        },
      },
    };
    console.log('action: ', JSON.stringify(data.interactive.action));
    //return sendMessage(data);
  }
  async function sendStatusUpdate(status, message) {
    const data = {
      messaging_product: 'whatsapp',
      status,
      message_id: message.id,
    };
    return sendMessage(data);
  }

  // Return the methods as an object
  return {
    sendTextMessage,
    sendImageMessage,
    sendDocumentMessage,
    sendTemplateMessage,
    sendFlowMessage,
    sendStatusUpdate,
  };
}

export default createWhatsAppClient;
