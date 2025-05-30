/*******************************************************
This file is created for each campaign type;
Handlers based on type of hook invoked are invoked within the switch staments.
This is when code= TEST01.
*********************************************************************************/
import dotnenv from "dotenv";
import handleTEST01CampaignTextMessage from "./TEST01CampaignHandlers/handleTEST01CampaignTextMessage.js";
import handleTEST01CampaignInteractiveMessage from "./TEST01CampaignHandlers/handleTEST01CampaignInteractiveMessage.js";

dotnenv.config();

export default async (req, res, next) => {
  const campaign = res.locals.campaign;
  switch (res.locals.type) {
    case "message":
      switch (res.locals.message.type) {
        case "text":
          await handleTEST01CampaignTextMessage(req, res);
          break;
        case "interactive":
          await handleTEST01CampaignInteractiveMessage(req, res);
          break;
        default:
          console.log(
            `unsupported message type for ${campaign.code} campaign: `,
            res.locals.message.type
          );
          res.sendStatus(200);
          break;
      }
      break;
    default:
      console.log("unsupported type for TEST01 campaign: ", res.locals.type);
      res.sendStatus(200);
      break;
  }
};
/* globals console*/
