import dotnenv from "dotenv";
import handleTEST01Campaign from "../campaignHandlers/handleTEST01Campaign.js";
import handleXCD09GCampaign from "../campaignHandlers/handleXCD09GCampaign.js";
import handleDefaultCampaign from "../campaignHandlers/handleDefaultCampaign.js";
import { verifyMessage } from "../../helpers/encryption.js";
import { isObject, isValidIndianMobile } from "../../helpers/utils.js";

dotnenv.config();

export default async (req, res, next) => {
  async function registrationStartedMessage(phone) {
    const promoter = (
      await contactsCollection.read({
        phone,
        is_promoter: true,
        lastMessageReceivedAt: {
          $gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      })
    )?.[0];
    if (promoter) {
      await waClient.sendTextMessage(promoter.phone, {
        body: `A new regisrtaion has been started by ${contact.wa_name}, please ensure its completed to get credit. `
      });
    }
  }

  const { message, contact, campaigns, waClient } = res.locals;
  const { contactsCollection } = res.locals.collections;

  // fields to be updated in contact;

  // extract code and payload from the campaign
  // payload:object with key value pair fields and tags:array
  // add utm parameters to fields to override default campaign utm.
  const campaignRegex = /^\[([a-zA-Z0-9]{6})\](?:\{(.*?)\})?/;
  const match = message.text.body.match(campaignRegex);
  const code = match && campaigns[match[1]] ? match[1] : null;
  const signedMessage = match && match[2] ? match[2] : null;
  const payload = verifyMessage(signedMessage)
    ? verifyMessage(signedMessage)
    : {};
  console.log(
    "handleTextmessage 27 signedmessage payload: ",
    signedMessage,
    payload
  );
  console.log("message: ", message);

  const { tags, ...rest } = payload;
  contact.lastTextMessageReceivedAt = new Date(message.timestamp * 1000);
  let fieldsToUpdate = {
    lastTextMessageReceivedAt: new Date(message.timestamp * 1000)
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
      const { utm_source, utm_medium } = utm;
      if (
        (utm_medium === "app_referral" || utm_medium === "promoter") &&
        isValidIndianMobile(utm_source)
      ) {
        fieldsToUpdate["referredBy"] = utm_source;
        fieldsToUpdate.referralType = utm_medium;
        if (utm_medium === "promoter") {
          registrationStartedMessage(utm_source);
        }
      }
      fieldsToUpdate = { ...fieldsToUpdate, createdBy: code, utm };
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
  const switch_code = res.locals.campaign?.parent_campaign_code
    ? res.locals.campaign?.parent_campaign_code
    : code;
  switch (switch_code) {
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
