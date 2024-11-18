/*******************************************************
This file is created for each campaign type;
Handlers based on type oh hook invoked are invoked within the switch staments.
This is when NO running campaign code is found.
*********************************************************************************/
import dotnenv from 'dotenv';
import createCommInCRM from '../../helpers/crm.js';
import handleDefaultCampaignTextMessage from './defaultCampaignHandlers/handleDefaultCampaignTextMessage.js';

dotnenv.config();

export default async (req, res, next) => {
  switch (res.locals.type) {
    case 'message':
      switch (res.locals.message.type) {
        case 'text':
          handleDefaultCampaignTextMessage(req, res);
          break;
        case 'default':
          console.log(
            'unsupported message type for default campaign type: ',
            res.locals.message.type
          );
          res.locals.waClient.sendStatusUpdate('read', message);
          res.sendStatus(200);
          break;
      }
      break;
    case 'default':
      console.log('unsupported type for default campaign: ', res.locals.type);
      res.locals.waClient.sendStatusUpdate('read', message);
      res.sendStatus(200);
      break;
  }
};
