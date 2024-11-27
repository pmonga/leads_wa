import { get, set, del } from '../helpers/storage.js';
import {
  decryptRequest,
  encryptResponse,
  FlowEndpointException,
} from '../helpers/encryption.js';

// handle initial request when opening the flow
export const getNextScreen = async (req, res, decryptedBody) => {
  const { screen, data, version, action, flow_token } = decryptedBody;
  const flow_id = 1214667192982073;

  if (action === 'data_exchange') {
    return {
      screen: 'MY_SCREEN',
      data: {
        // custom data for the screen
        greeting: 'Hey there! 👋',
      },
    };
  }

  if (action === 'data_exchange') {
    // handle the request based on the current screen
    switch (screen) {
      case 'WELCOME':
        // TODO: process flow input data
        console.info('Input name:', data?.name);

        // send success response to complete and close the flow
        return {
          screen: 'SUCCESS',
          data: {
            extension_message_response: {
              params: {
                flow_token,
              },
            },
          },
        };
      default:
        break;
    }
  }

  console.error('Unhandled request body:', decryptedBody);
  throw new Error(
    'Unhandled endpoint request. Make sure you handle the request action & screen logged above.'
  );
};
