/*******************************************************
This file is created for each campaign type;
Handlers based on type oh hook invoked are invoked within the switch staments.
This is when NO running campaign code is found.
*********************************************************************************/
import dotnenv from "dotenv";
import createCommInCRM from "../../helpers/crm.js";
import handleDefaultCampaignTextMessage from "./defaultCampaignHandlers/handleDefaultCampaignTextMessage.js";
import handleDefaultCampaignInteractiveMessage from "./defaultCampaignHandlers/handleDefaultCampaignInteractiveMessage.js";

dotnenv.config();

export default async (req, res, next) => {
  switch (res.locals.type) {
    case "message":
      switch (res.locals.message.type) {
        case "text":
          await handleDefaultCampaignTextMessage(req, res);
          break;
        case "interactive":
          await handleDefaultCampaignInteractiveMessage(req, res);
          break;
        default:
          console.log(
            "unsupported message type for default campaign type: ",
            res.locals.message.type
          );
          break;
      }
      break;
    default:
      console.log("unsupported type for default campaign: ", res.locals.type);
      break;
  }
};
/* global console*/
