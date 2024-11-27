import { get, set, del } from './helpers/storage.js';

export const getNextScreen = async (req, res, decryptedBody) => {
  const { screen, data, version, action, flow_token } = decryptedBody;
  // handle health check request
  if (action === 'ping') {
    return {
      data: {
        status: 'active',
      },
    };
  }

  // handle error notification
  if (data?.error) {
    console.warn('Received client error:', data);
    return {
      data: {
        acknowledged: true,
      },
    };
  }
  const { flow_id } = await get(flow_token);
  switch (flow_id) {
    // Flow KBM_test id 1214667192982073
    case '1214667192982073':
  }
};
