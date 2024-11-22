import dotnenv from 'dotenv';
import createCommInCRM from '../../../../helpers/crm.js';
import generateToken from '../../../../helpers/tokenizer.js';
import { set, get, del } from '../../../../helpers/storage.js';

dotnenv.config();
export default async (req, res) => {
  const message = res.locals.message;
  const code = 'TEST01';
  const campaign = res.locals.campaigns[code];

  const phone = '+' + message.from;
  const contactsCollection = res.locals.collections.contactsCollection;
  const campaignsCollection = res.locals.collections.campaignsCollection;

  const flow_object = await get(res.locals.flow_token);
  console.log('flow_object: ', flow_object);
  console.log('flow_data', res.locals.flow_data);
  res.locals.waClient.sendStatusUpdate('read', message);
};
