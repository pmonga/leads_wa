import handleTEST01CampaignFlowMessage from "./TEST01InteractiveTypeHandlers/handleTEST01CampaignFlowMessage.js";

const handleTEST01CampaignInteractiveMessage = async function (req, res) {
  const type = res.locals.message.interactive.type;
  const code = res.locals.code;
  switch (type) {
    case "nfm_reply":
      await handleTEST01CampaignFlowMessage(req, res);
      break;
    default:
      console.log(
        `Not supported ${code} Campaign Interactive message type: `,
        type
      );
      break;
  }
};

export default handleTEST01CampaignInteractiveMessage;
/*globals console*/
