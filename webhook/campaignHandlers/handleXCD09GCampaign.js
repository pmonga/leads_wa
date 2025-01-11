/*******************************************************
This file is created for each campaign type;
Handlers based on type of hook invoked are invoked within the switch staments.
This is when code= XCD09G.
*********************************************************************************/
import dotnenv from "dotenv";
import handleXCD09GCampaignTextMessage from "./XCD09GCampaignHandlers/handleXCD09GCampaignTextMessage.js";
import handleXCD09GCampaignInteractiveMessage from "./XCD09GCampaignHandlers/handleXCD09GCampaignInteractiveMessage.js";

dotnenv.config();

export default async (req, res, next) => {
  switch (res.locals.type) {
    case "message":
      switch (res.locals.message.type) {
        case "text":
          await handleXCD09GCampaignTextMessage(req, res);
          break;
        case "interactive":
          await handleXCD09GCampaignInteractiveMessage(req, res);
          break;
        case "button":
          await handleXCD09GCampaignTextMessage(req, res);
          break;
        default:
          console.log(
            "unsupported message type for XCD09G campaign: ",
            res.locals.message.type
          );
          break;
      }
      break;
    default:
      console.log("unsupported type for XCD09G campaign: ", res.locals.type);
      break;
  }
};
/*global console*/
