import handleXCD09GCampaign from "../../campaignHandlers/handleXCD09GCampaign.js";

const handleButtonMessage = async function (req, res) {
  const { message, campaigns, contact } = res.locals;
  const [code, action] = message.interactive.button_reply.id.split("-");
  const campaign = campaigns[code];
  if (campaign) {
    res.locals.campaign = campaign;
    res.locals.code = code;
    res.locals.action = action;
    contact.tagsToAdd.push(code);
    if (Array.isArray(campaign.tags)) {
      contact.tagsToAdd = [...contact.tagsToAdd, ...campaign.tags];
    }
  }
  const utm = campaign?.utm ? { ...campaign.utm } : {};
  res.locals.crm.utm = { ...utm };
  switch (code) {
    case "XCD09G": {
      res.locals.crm.message += `[XCD09G] ${action} requested`;
      await handleXCD09GCampaign(req, res);
      break;
    }
    default:
      console.log("button_reply: Invalid campaign code:  ", code);
      res.locals.waClient.sendTextMessage(message.from, {
        body: `Your have clicked on an expired campaign link`
      });

      break;
  }
};

export default handleButtonMessage;
/*global console*/
