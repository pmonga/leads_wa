/*global console*/
import { get } from "./helpers/storage.js";
import { FLOW_KBM } from "./helpers/config.js";
import { getNextScreen as XCD09GgetNextScreen } from "./endpoint/XCD09Gendpoint.js";
import { set } from "./helpers/storage.js";

export const getNextScreen = async (req, res, decryptedBody) => {
  const { data, action, flow_token } = decryptedBody;
  // added for testing the end point remove  in production
  if (decryptedBody?.flow_token === "TEST") {
    const flow_token = decryptedBody.flow_token;
    const flow_obj = await get(flow_token);
    if (!flow_obj) {
      await set(flow_token, { flow_id: FLOW_KBM });
    }
  }

  // tesing code ends
  // handle health check request
  if (action === "ping") {
    return {
      data: {
        status: "active"
      }
    };
  }

  // handle error notification
  if (data?.error) {
    console.warn("Received client error:", data);
    return {
      data: {
        acknowledged: true
      }
    };
  }
  const flow_obj = await get(flow_token);
  let response;
  switch (flow_obj?.code) {
    // Flow KBM_test id 1214667192982073
    case "XCD09G":
      response = await XCD09GgetNextScreen(req, res, decryptedBody);
      break;
    default:
      // close the flow;
      response = {
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token
            }
          }
        }
      };
      // throw new Error(
      //   `Unhadled flow_id in the endpoint. Please check your endpoint for flow_id : ${flow_id}".`
      // );
      break;
  }
  return response;
};
