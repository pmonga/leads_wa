import handleDefaultCampaignFlowMessage from "./DefaultInteractiveTypeHandlers/handleDefaultCampaignFlowMessage.js";
import handleDefaultCampaignReplyButtonMessage from "./DefaultInteractiveTypeHandlers/handleDefaultCampaignReplyButtonMessage.js";

const handleDefaultCampaignInteractiveMessage = async function (req, res) {
  const type = res.locals.message.interactive.type;
  switch (type) {
    case "nfm_reply":
      await handleDefaultCampaignFlowMessage(req, res);
      break;
    case "button_reply":
      await handleDefaultCampaignReplyButtonMessage(req, res);
      break;
    default:
      console.log("Not supported Interactive message type: ", type);
      break;
  }
};

export default handleDefaultCampaignInteractiveMessage;
/* global console */
