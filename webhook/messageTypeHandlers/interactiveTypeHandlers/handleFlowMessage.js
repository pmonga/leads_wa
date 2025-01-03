// Inbound Flow message handler
import handleTEST01Campaign from "../../campaignHandlers/handleTEST01Campaign.js";
import handleXCD09GCampaign from "../../campaignHandlers/handleXCD09GCampaign.js";
import { del, get } from "../../../helpers/storage.js";

const handleFlowMessage = async function (req, res) {
  const { message, campaigns, contact } = res.locals;
  let campaign;
  const flow_data = JSON.parse(message.interactive.nfm_reply?.response_json);

  const flow_token = flow_data?.flow_token;
  const flow_obj = await get(flow_token);
  const code = campaigns[flow_obj?.code] ? flow_obj.code : false;
  if (code) {
    res.locals.code = code;
    campaign = res.locals.campaign = campaigns[code];
    contact.tagsToAdd.push(code);
    if (Array.isArray(campaign.tags)) {
      contact.tagsToAdd = [...contact.tagsToAdd, ...campaign.tags];
    }
  }
  res.locals.flow_token = flow_token;
  res.locals.flow_obj = flow_obj;
  res.locals.flow_data = flow_data;
  const utm = res.locals.campaign?.utm ? { ...res.locals.campaign.utm } : {};
  res.locals.crm.utm = { ...utm };
  switch (code) {
    case "TEST01": {
      res.locals.crm.message +=
        "[TEST01] Data from Flow: " +
        JSON.stringify({
          data: { ...flow_data },
          details: { ...flow_obj }
        });
      await handleTEST01Campaign(req, res);
      break;
    }
    case "XCD09G": {
      const { finishedAt, is_sample, won } = flow_obj;
      res.locals.crm.message +=
        "[XCD09G] Data from Flow: " +
        JSON.stringify({
          message: "Played the game",
          finishedAt,
          sample_game: is_sample,
          credits_won: won
        });
      await handleXCD09GCampaign(req, res);
      break;
    }
    default:
      res.locals.crm.message += "SYS MSG:Invalid flow token or campaign code";
      console.log("Flow: Invalid campaign code:  ", code);
      res.locals.waClient.sendTextMessage(message.from, {
        body: `Your token is invalid or has expired. Please try again after sometime.`
      });
      await del(flow_token);
      break;
  }
};

export default handleFlowMessage;
/*global console*/
