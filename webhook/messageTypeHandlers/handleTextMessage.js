import dotnenv from 'dotenv';
import createCommInCRM from '../../helpers/crm.js';

dotnenv.config();

export default async (req, res, next) => {
  const campaignRegex = /^\[([A-Za-z0-9]{6})\]/;
  const message = res.locals.message;
  // check if message is from a valid Indian number
  if (!/^91/.test(message.from)) {
    res.status(200).send('Not a valid Indian mobile');
    return 'Not a valid Indian mobile';
  }
  // extract code from the campaign
  const match = message.text.body.match(campaignRegex);
  const campaigns = res.local.campaigns;
  const code = match && campaigns[match[1]] ? match[1] : false;
  if (code) {
    res.locals.code = code;
    res.locals.campaign = campaigns[code];
  }

  // Contact update or create
  const tagsToAdd = res.locals?.campaign?.tags || ['self'];
  const phone = message.from;
  const contactsCollection = res.locals.collections.contactsCollection;
  let contact = await contactsCollection.read({ phone })?.[0];
  if (contact) {
    await contactsCollection.update(
      { phone: phone },
      { $addToSet: { tags: { $each: tagsToAdd } } }
    );
  } else {
    const mobile = phone.slice(2);
    contact = {
      phone,
      mobile,
      email: '',
      name: '',
      wa_name:
        req.body.entry?.[0].changes?.[0].value?.contacts?.[0].profile.name ||
        '',
      wa_id: req.body.entry?.[0].changes?.[0].value?.contacts?.[0].wa_id,
      createdBy: res.local.campaign?.code || 'self',
      tags: tagsToAdd,
    };
    contact._id = (await contactsCollection.create(contact)).insertedId;
  }
  res.locals.contact = contact;

  // Save the message in messages collection
  res.locals.collections.messagesCollection.create({
    contact_id: contact._id,
    message_object: { ...req.body },
  });

  // Update CRM
  let utm = {
    ...res.locals?.campaign?.utm,
  } || { utm_source: 'whatsapp', utm_campaign: 'self' };
  let crmData = {
    source: 'whatsApp LP',
    first_name: contact.name,
    mobile: contact.mobile,
    email: contact.email,
    wa_name: contact.wa_name,
    message: message.text.body, // + ' campaign message:' + res.locals.campaign?.crmMessage,
    ...utm,
  };
  if (process.env.ENV === 'PROD') {
    await createCommInCRM(crmData);
  } else {
    console.log('CRM Entry :', JSON.stringify(crmData));
  }

  // send message to contact
  let reply = { type:'text',
  body: 'Thank you for contacting Alchemist, we will get in touch with you soon'};
  // get campaign specific reply 
  if (code){
    if(contact.isRegistered){
      reply = res.locals.campaign.reply.registered
    } else reply = res.locals.campaign.reply.unregistered
  }
  if(reply.type ==='text')
    res.locals.waClient.sendTextMessage(contact.phone, reply);
  res.locals.waClient.sendStatusUpdate('read', message);

  res.sendStatus(200);
};