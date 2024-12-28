import dotnenv from "dotenv";
import handleTEST01Campaign from "../campaignHandlers/handleTEST01Campaign.js";
import handleXCD09GCampaign from "../campaignHandlers/handleXCD09GCampaign.js";
import handleDefaultCampaign from "../campaignHandlers/handleDefaultCampaign.js";
import { verifyMessage } from "../../helpers/encryption.js";
import { isObject } from "../../helpers/utils.js";

dotnenv.config();

export default async (req, res, next) => {
  const message = res.locals.message;
  const contact = res.locals.contact;
  const campaigns = res.locals.campaigns;

  // fields to be updated in contact;

  // extract code and payload from the campaign
  // payload:object with key value pair fields and tags:array
  // add utm parameters to fields to override default campaign utm.
  const campaignRegex = /^\[([a-zA-Z0-9]{6})\](\{.*?\})?/;
  const match = message.text.body.match(campaignRegex);
  const code = match && campaigns[match[1]] ? match[1] : null;
  const signedMessage = match && match[2] ? match[2] : null;
  const payload = verifyMessage(signedMessage)
    ? verifyMessage(signedMessage)
    : {};
  const { tags, ...rest } = payload;
  let fieldsToUpdate = {
    lastTextMessageReceivedAt: Date(message.timestamp)
  };
  let tagsToAdd = Array.isArray(tags) ? [...tags] : [];
  if (code) {
    res.locals.code = code;
    res.locals.payload = payload;
    res.locals.campaign = campaigns[code];
    const utm = isObject(res.locals.campaign?.utm)
      ? {
          ...res.locals.campaign?.utm,
          ...rest
        }
      : { ...rest };
    res.locals.crm.utm = { ...res.locals.crm.utm, ...utm };
    res.locals.crm.message += " " + message.text.body;
    if (contact.isNew) {
      fieldsToUpdate = { ...fieldsToUpdate, createdBy: code, ...utm };
    }
    tagsToAdd = Array.isArray(campaigns[code]?.tags)
      ? [code, ...campaigns[code].tags, ...tagsToAdd]
      : [code, ...tagsToAdd];
  } else {
    res.locals.crm.utm = {
      ...res.locals.crm.utm,
      utm_source: "whatsApp",
      utm_campaign: "self"
    };
    res.locals.crm.message += " " + message.text.body;
    tagsToAdd = ["self"];
    if (contact.isNew)
      fieldsToUpdate = {
        createdBy: "self",
        utm_campaign: "self"
      };
  }
  contact.fieldsToUpdate = isObject(contact.fieldsToUpdate)
    ? { ...contact.fieldsToUpdate, ...fieldsToUpdate }
    : { ...fieldsToUpdate };
  contact.tagsToAdd = Array.isArray(contact.tagsToAdd)
    ? [...contact.tagsToAdd, ...tagsToAdd]
    : [...tagsToAdd];

  switch (code) {
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
/* global console */
