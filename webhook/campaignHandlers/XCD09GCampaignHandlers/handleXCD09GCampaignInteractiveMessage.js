import handleXCD09GCampaignFlowMessage from "./XCD09GInteractiveTypeHandlers/handleXCD09GCampaignFlowMessage.js";
import handleXCD09GCampaignButtonMessage from "./XCD09GInteractiveTypeHandlers/handleXCD09GCampaignButtonMessage.js";
const handleXCD09GCampaignInteractiveMessage = async function (req, res) {
  const type = res.locals.message.interactive.type;
  switch (type) {
    case "nfm_reply":
      await handleXCD09GCampaignFlowMessage(req, res);
      break;
    case "button_reply":
      await handleXCD09GCampaignButtonMessage(req, res);
      break;
    default:
      console.log(
        "Not supported XCD09G Campaign Interactive message type: ",
        type
      );
      break;
  }
};

export default handleXCD09GCampaignInteractiveMessage;
/*global console*/
