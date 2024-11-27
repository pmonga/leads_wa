// Inbound Flow message handler
import handleTEST01Campaign from '../../campaignHandlers/handleTEST01Campaign.js';
import { get } from '../../../helpers/storage.js';

const handleFlowMessage = async function (req, res) {
  const flow_data = JSON.parse(
    res.locals.message.interactive.nfm_reply?.response_json
  );
  const message = res.locals.message;
  const flow_token = flow_data?.flow_token;
  const code = flow_token ? (await get(flow_token))?.code : undefined;
  res.locals.code = code;
  res.locals.campaign = res.locals.campaigns[code];
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
        body: `Oops! Something has gone wrong. Please try again after sometime.`,
      });
      res.locals.waClient.sendStatusUpdate('read', message);
      res.sendStatus(200);
      break;
  }
};

export default handleFlowMessage;
