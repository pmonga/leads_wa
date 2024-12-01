import dotnenv from 'dotenv';
//import createCommInCRM from '../../../helpers/crm.js';
import generateToken from '../../../helpers/tokenizer.js';
import { set, get } from '../../../helpers/storage.js';

dotnenv.config();
export default async (req, res, next) => {
  //const message = res.locals.message;
  const contact = res.locals.contact;
  const phone = contact.phone;
  const code = res.locals.code;
  const campaign = res.locals.campaign;

  //const contactsCollection = res.locals.collections.contactsCollection;
  const campaignsCollection = res.locals.collections.campaignsCollection;

  // send message to contact
  if (contact.name) {
    const registrations = (
      await campaignsCollection.read(
        { _id: campaign._id },
        { projection: { registrations: 1 } }
      )
    )?.[0].registrations;
    let registered = registrations.find((e) => e.phone === contact.phone);
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
  } else {
    // send SIGN UP flow message here flow_id: '1760272798116365'
    const flow_id = '1760272798116365';
    const token = generateToken(JSON.stringify({ phone, code, flow_id }));
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
      flow_id, //Lead Sign Up
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
      flow_id,
      created: new Date(),
    });
  }
};
