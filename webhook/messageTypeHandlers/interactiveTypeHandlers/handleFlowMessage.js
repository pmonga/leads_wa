// Inbound Flow message handler
import handleTEST01Campaign from '../../campaignHandlers/handleTEST01Campaign.js';
import { get } from '../../../helpers/storage.js';

const handleFlowMessage = async function (req, res) {
  const message = res.locals.message;
  const campaigns = res.locals.campaigns;

  const flow_data = JSON.parse(
    res.locals.message.interactive.nfm_reply?.response_json
  );

  const flow_token = flow_data?.flow_token;
  const flow_object = await get(flow_token);
  const code = campaigns[flow_object?.code] ? flow_object.code : false;
  if (code) {
    res.locals.code = code;
    res.locals.campaign = campaigns[code];
    const utm = res.locals.campaign?.utm ? { ...res.locals.campaign.utm } : {};
    res.locals.crm.utm = { ...res.locals.crm.utm, ...utm };
    res.locals.crm.message +=
      ' Data from Flow: ' + JSON.stringify({ ...flow_data, ...flow_object });
  }
  res.locals.flow_token = flow_token;
  res.locals.flow_data = flow_data;
  switch (code) {
    case 'TEST01':
      await handleTEST01Campaign(req, res);
      break;
    case 'XCD09G':
      await handleTEST01Campaign(req, res);
      break;
    default:
      console.log('Flow: Invalid campaign code:  ', code);
      res.locals.waClient.sendTextMessage(message.from, {
        body: `Your token is invalid or has expired. Please try again after sometime.`,
      });
      break;
  }
};

export default handleFlowMessage;
