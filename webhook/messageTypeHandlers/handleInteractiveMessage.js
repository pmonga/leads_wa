import handleButtonMessage from "./interactiveTypeHandlers/handleButtonMessage.js";
import handleFlowMessage from "./interactiveTypeHandlers/handleFlowMessage.js";

const handleInteractiveMessage = async function (req, res) {
  const type = res.locals.message.interactive.type;
  switch (type) {
    case "nfm_reply":
      await handleFlowMessage(req, res);
      break;
    case "button_reply":
      await handleButtonMessage(req, res);
      break;
    default:
      console.log("Not supported Interactive message type: ", type);
      break;
  }
};

export default handleInteractiveMessage;
/*global console*/
