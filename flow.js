/*global console*/
import { get } from "./helpers/storage.js";
import { FLOW_KBM } from "./helpers/config.js";
import { getNextScreen as KBMgetNextSCreen } from "./endpoint/KBM.js";

export const getNextScreen = async (req, res, decryptedBody) => {
  const { data, action, flow_token } = decryptedBody;
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
  const { flow_id } = await get(flow_token);
  switch (flow_id) {
    // Flow KBM_test id 1214667192982073
    case FLOW_KBM:
      KBMgetNextSCreen(req, res, decryptedBody);
      break;
    default:
      throw new Error(
        `Unhadled flow_id in the endpoint. Please check your endpoint for flow_id : ${flow_id}".`
      );
    //break;
  }
};
