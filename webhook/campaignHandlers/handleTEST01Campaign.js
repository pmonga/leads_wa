/*******************************************************
This file is created for each campaign type;
Handlers based on type oh hook invoked are invoked within the switch staments.
This is when code= TEST01.
*********************************************************************************/
import dotnenv from 'dotenv';
import createCommInCRM from '../../helpers/crm.js';
import handleTEST01CampaignTextMessage from './TEST01CampaignHandlers/handleTEST01CampaignTextMessage.js';

dotnenv.config();

export default async (req, res, next) => {
  switch (res.locals.type) {
    case 'message':
      switch (res.locals.message.type) {
        case 'text':
          await handleTEST01CampaignTextMessage(req, res);
          break;
        case 'default':
          console.log(
            'unsupported message type for TEST01 campaign: ',
            res.locals.message.type
          );
          res.sendStatus(200);
          break;
      }
      break;
    case 'default':
      console.log('unsupported type for TEST01 campaign: ', res.locals.type);
      res.sendStatus(200);
      break;
  }
};
