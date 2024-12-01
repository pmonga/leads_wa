import dotnenv from 'dotenv';
import createCommInCRM from '../../../../helpers/crm.js';
import generateToken from '../../../../helpers/tokenizer.js';
import { set, get, del } from '../../../../helpers/storage.js';

dotnenv.config();
export default async (req, res) => {
  const code = res.locals.code;
  const campaign = res.locals.campaign;
  const contact = res.locals.contact;

  const contactsCollection = res.locals.collections.contactsCollection;
  const campaignsCollection = res.locals.collections.campaignsCollection;

  const flowData = res.locals.flow_data;
  const flowObject = await get(res.locals.flow_token);
  if (
    flowObject.flow_id != '1760272798116365' ||
    flowObject.phone != contact.phone
  ) {
    let reply = {
      body: 'Sorry, Incorrect parameters. Please try again later.',
    };
    del(res.locals.flow_token);
    await res.locals.waClient.sendTextMessage(contact.phone, reply);
    return;
  }
  // flow_object will exist else this handler wouldn't have been invoked
  contact.tagsToAdd = [
    ...contact.tagsToAdd,
    code,
    ...flowData.courses,
    ...campaign.tags,
  ];
  if (!contact.name) {
    // update contact info
    contact.name = flowData.name;
    contact.email = flowData.email;
    await contactsCollection.update(
      { phone: flowObject.phone },
      {
        $set: { name: flowData.name, email: flowData.email },
      }
    );
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
    } and your registration id is ${registered.regnum}`,
  };
  res.locals.waClient.sendTextMessage(contact.phone, reply);
};
