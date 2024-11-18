import dotnenv from 'dotenv';
import createCommInCRM from '../../../helpers/crm.js';

dotnenv.config();
export default async (req, res, next) => {
  const message = res.locals.message;

  //No campaign hence self contact
  const tagsToAdd = ['self'];
  const phone = message.from;
  const contactsCollection = res.locals.collections.contactsCollection;

  // search for existing Contact and if exists update the tags
  let contact = (await contactsCollection.read({ phone: phone }))?.[0];
  if (contact) {
    await contactsCollection.update(
      { phone: phone },
      { $addToSet: { tags: { $each: tagsToAdd } } }
    );
  } // eslse create a new contact
  else {
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
      createdBy: 'self',
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

  // Update CRM with the UTM fot no campaign
  let utm = { utm_source: 'whatsapp', utm_campaign: 'self' };
  let crmData = {
    source: 'whatsApp LP',
    first_name: contact.name,
    mobile: contact.mobile,
    email: contact.email,
    wa_name: contact.wa_name,
    message: message.text.body,
    ...utm,
  };
  if (process.env.ENV === 'PROD') {
    await createCommInCRM(crmData);
  } else {
    console.log('CRM Entry :', JSON.stringify(crmData));
  }

  // send message to contact
  let reply = {
    type: 'text',
    body: 'Thank you for contacting Alchemist, we will get in touch with you soon',
  };
  // get campaign specific reply use for existing campaign codes
  //   if (code) {
  //     if (contact.isRegistered) {
  //       reply = res.locals.campaign.reply.registered;
  //     } else reply = res.locals.campaign.reply.unregistered;
  //   }
  //   if (reply.type === 'text')
  //     res.locals.waClient.sendTextMessage(contact.phone, { body: reply.body });
  res.locals.waClient.sendTextMessage(contact.phone, { body: reply.body });
  res.locals.waClient.sendStatusUpdate('read', message);

  res.sendStatus(200);
};
