import dotnenv from 'dotenv';
import createCommInCRM from '../../../../helpers/crm.js';
import generateToken from '../../../../helpers/tokenizer.js';
import { set, get, del } from '../../../../helpers/storage.js';

dotnenv.config();
export default async (req, res) => {
  const message = res.locals.message;
  const code = 'TEST01';
  const campaign = res.locals.campaigns[code];

  const contactsCollection = res.locals.collections.contactsCollection;
  const campaignsCollection = res.locals.collections.campaignsCollection;

  const flowObject = await get(res.locals.flow_token);
  const flowData = res.locals.flow_data;
  // flow_object will exist else this handler wouldnt have been invoked
  const tagsToAdd = [code, ...flowData.courses];
  let contact = (
    await contactsCollection.read({ phone: flowObject.phone })
  )?.[0];
  if (!contact) {
    res.locals.waClient.sendStatusUpdate('read', message);
    res.sendStatus(200);
    return;
  }

  // update contact info and refresh contact
  await contactsCollection.update(
    { phone: flowObject.phone },
    {
      $addToSet: { tags: { $each: tagsToAdd } },
      $set: { name: flowData.name, email: flowData.email },
    }
  );
  contact = (await contactsCollection.read({ phone: flowObject.phone }))?.[0];

  // Save the message in messages collection
  res.locals.collections.messagesCollection.create({
    contact_id: contact._id,
    message_object: { ...req.body },
  });

  // Update CRM with the UTM for TEST01 campaign
  let utm = { ...campaign.utm };
  let crmData = {
    source: 'whatsApp LP',
    first_name: contact.name,
    mobile: contact.mobile,
    email: contact.email,
    wa_name: contact.wa_name,
    message: JSON.stringify({ ...flowData, ...flowObject }),
    ...utm,
  };
  if (process.env.ENV === 'PROD') {
    createCommInCRM(crmData);
  } else {
    //console.log('CRM Entry :', JSON.stringify(crmData));
  }

  // clean up, remove the token
  del(res.locals.flow_token);

  //register for the campaign event
  const registrations = (
    await campaignsCollection.read(
      { _id: campaign._id },
      { projection: { registrations: 1 } }
    )
  )?.[0].registrations;
  let registered = registrations.find((e) => e._id === contact._id);

  if (!registered) {
    const { _id, name, mobile, phone, email } = contact;
    registered = {
      _id,
      name,
      mobile,
      phone,
      email,
      regnum: registrations.length + 1,
    };
    registrations.push(registered);
    await campaignsCollection.update(
      { _id: campaign._id },
      { $set: { registrations: registrations } }
    );
  }
  let reply = {
    body: `Thank you, ${
      registered.name
    }, you are registered for ${campaign.name.toUpperCase()} with mobile number ${
      registered.mobile
    } and your registartion id is ${registered.regnum}`,
  };
  res.locals.waClient.sendTextMessage(contact.phone, reply);
  res.locals.waClient.sendStatusUpdate('read', message);
  res.sendStatus(200);
};
