import handleDefaultCampaignReplyButtonMessage from "../campaignHandlers/defaultCampaignHandlers/DefaultInteractiveTypeHandlers/handleDefaultCampaignReplyButtonMessage.js";
import handleDefaultCampaignTextMessage from "../campaignHandlers/defaultCampaignHandlers/handleDefaultCampaignTextMessage.js";
import handleXCD09GCampaign from "../campaignHandlers/handleXCD09GCampaign.js";

const handleButtonMessage = async function (req, res) {
  const { message, campaigns, contact } = res.locals;
  const [code, action] = message.button.payload.split("-");
  const campaign = campaigns[code];
  res.locals.code = code;
  res.locals.action = action;
  if (campaign) {
    res.locals.campaign = campaign;
    contact.tagsToAdd.push(code);
    if (Array.isArray(campaign.tags)) {
      contact.tagsToAdd = [...contact.tagsToAdd, ...campaign.tags];
    }
  }
  const utm = campaign?.utm ? { ...campaign.utm } : {};
  res.locals.crm.utm = { ...utm };
  const switch_code = campaign?.parent_campaign_code
    ? campaign.parent_campaign_code
    : code;
  switch (switch_code) {
    case "XCD09G": {
      res.locals.crm.message += `[XCD09G] marketing template button : ${action} requested`;
      await handleXCD09GCampaign(req, res);
      break;
    }
    case "COMMON": {
      res.locals.crm.message += `[COMMON] marketing template button: ${action} requested`;
      await handleDefaultCampaignReplyButtonMessage(req, res);
      break;
    }
    default: {
      await handleDefaultCampaignTextMessage(req, res);
      break;
    }
  }
};
export default handleButtonMessage;
/*global console*/
