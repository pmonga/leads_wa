import dotnenv from 'dotenv';
import createCommInCRM from '../../helpers/crm.js';
import handleTEST01Campaign from '../campaignHandlers/handleTEST01Campaign.js';
import handleDefaultCampaign from '../campaignHandlers/handleDefaultCampaign.js';

dotnenv.config();

export default async (req, res, next) => {
  const campaignRegex = /^\[([A-Za-z0-9]{6})\]/;
  const message = res.locals.message;
  console.log('from: ', message.from);
  // check if message is from a valid Indian number
  if (!/^91/.test(message.from)) {
    res.status(200).send('Not a valid Indian mobile');
    return 'Not a valid Indian mobile';
  }
  // extract code from the campaign
  const match = message.text.body.match(campaignRegex);
  const campaigns = res.locals.campaigns;
  const code = match && campaigns[match[1]] ? match[1] : false;
  if (code) {
    res.locals.code = code;
    res.locals.campaign = campaigns[code];
  }
  switch (code) {
    case 'TEST01':
      await handleTEST01Campaign(req, res);
      break;
    case 'default':
      await handleDefaultCampaign(req, res);
      break;
  }
};
