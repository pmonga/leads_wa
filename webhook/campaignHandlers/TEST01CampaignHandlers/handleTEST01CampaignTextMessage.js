import dotnenv from 'dotenv';
import createCommInCRM from '../../../helpers/crm.js';
import generateToken from '../../../helpers/tokenizer.js';
import { set, get } from '../../../helpers/storage.js';

dotnenv.config();
export default async (req, res, next) => {
  const message = res.locals.message;
  const code = 'TEST01';
  const campaign = res.locals.campaigns[code];

  //Add tags for the campaign to be added to the contact
  const tagsToAdd = [code, ...campaign.tags];
  const phone = '+' + message.from;
  const contactsCollection = res.locals.collections.contactsCollection;
  const campaignsCollection = res.locals.collections.campaignsCollection;

  // search for existing Contact and if exists update the tags
  let contact = (await contactsCollection.read({ phone: phone }))?.[0];
  if (contact) {
    await contactsCollection.update(
      { phone: phone },
      { $addToSet: { tags: { $each: tagsToAdd } } }
    );
  } // eslse create a new contact
  else {
    const mobile = phone.slice(3);
    contact = {
      phone,
      mobile,
      email: '',
      name: '',
      wa_name:
        req.body.entry?.[0].changes?.[0].value?.contacts?.[0].profile.name ||
        '',
      wa_id: req.body.entry?.[0].changes?.[0].value?.contacts?.[0].wa_id,
      createdBy: code,
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

  // Update CRM with the UTM for TEST01 campaign
  let utm = { ...campaign.utm };
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
    createCommInCRM(crmData);
  } else {
    //console.log('CRM Entry :', JSON.stringify(crmData));
  }

  // send message to contact
  if (contact.name) {
    const registrations = [
      ...(
        await campaignsCollection.read(
          { _id: campaign._id },
          { projection: { registrations: 1 } }
        )
      ).registrations,
    ];
    let registered = registrations.find((e) => e._id === contact._id);

    if (!registered) {
      registered = {
        _id,
        name,
        mobile,
        phone,
        email,
        regnum: registrations.length,
      } = contact;
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
  } else {
    // send flow message here
    // to get the contacts name
    const token = generateToken(
      JSON.stringify({ phone, code, flow_id: '1760272798116365' })
    );
    const layout = {
      header: {
        type: 'text',
        text: 'Flow message header',
      },
      body: {
        text: 'Flow message body',
      },
      footer: {
        text: 'Flow message footer',
      },
    };
    const params = {
      flow_token: token,
      mode: 'draft',
      flow_id: '1760272798116365', //Lead Sign Up
      flow_cta: 'Register',
      flow_action: 'navigate',
      flow_action_payload: {
        screen: 'JOIN_NOW',
      },
    };
    await res.locals.waClient.sendFlowMessage(contact.phone, layout, params);
    await set(token, {
      phone,
      code,
      flow_id: '1760272798116365',
      created: new Date(),
    });
  }
};
