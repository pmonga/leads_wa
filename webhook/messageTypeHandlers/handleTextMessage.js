import dotnenv from "dotenv";
import handleTEST01Campaign from "../campaignHandlers/handleTEST01Campaign.js";
import handleXCD09GCampaign from "../campaignHandlers/handleXCD09GCampaign.js";
import handleDefaultCampaign from "../campaignHandlers/handleDefaultCampaign.js";

dotnenv.config();

export default async (req, res, next) => {
  const message = res.locals.message;
  const contact = res.locals.contact;
  const campaigns = res.locals.campaigns;

  // fields to be updated in contact;

  // extract code from the campaign
  const campaignRegex = /^\[([A-Za-z0-9]{6})\]/;
  const match = message.text.body.match(campaignRegex);
  const code = match && campaigns[match[1]] ? match[1] : false;
  let base_code, campaign;

  if (code) {
    res.locals.code = code;
    res.locals.campaign = campaign = campaigns[code];
    base_code = campaigns[code]?.base_code || code;
    const utm = res.locals.campaign?.utm ? { ...res.locals.campaign.utm } : {};
    res.locals.crm.utm = { ...res.locals.crm.utm, ...utm };
    res.locals.crm.message += " " + message.text.body;
    contact.createdBy = contact.createdBy || code;
    contact.tagsToAdd = Array.isArray(campaigns[code]?.tags)
      ? [code, ...campaigns[code].tags]
      : [code];
  } else {
    res.locals.crm.utm = { ...res.locals.crm.utm, utm_source: "self" };
    res.locals.crm.message += " " + message.text.body;
    contact.tagsToAdd = [...contact.tagsToAdd, "self"];
    contact.createdBy = contact.createdBy || "self";
  }

  switch (base_code) {
    case "TEST01":
      await handleTEST01Campaign(req, res);
      break;
    case "XCD09G":
      await handleXCD09GCampaign(req, res);
      break;
    default:
      await handleDefaultCampaign(req, res);
      break;
  }
};
