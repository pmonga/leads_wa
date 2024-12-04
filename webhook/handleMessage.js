import handleInteractiveMessage from './messageTypeHandlers/handleInteractiveMessage.js';
import handleTextMessage from './messageTypeHandlers/handleTextMessage.js';
import createCommInCRM from '../helpers/crm.js';

const handleMessage = async function (req, res) {
  const message = res.locals.message;

  // check if message is from a valid Indian number if not then return without doing anything
  if (!/^91/.test(message.from)) {
    res.locals.waClient.sendStatusUpdate('read', message);
    return;
  }

  const type = res.locals.message.type;
  const phone = '+' + message.from;
  const contactsCollection = res.locals.collections.contactsCollection;

  const contact =
    (await contactsCollection.read({ phone: phone }))?.[0] ||
    (await createContact(req, res));
  contact.tagsToAdd = [];
  res.locals.contact = contact;

  // Save the message in messages collection
  res.locals.collections.messagesCollection.create({
    contact_id: contact._id,
    message_object: { ...req.body },
  });

  console.log('handleMessage switch type:', type);
  switch (type) {
    case 'text':
      await handleTextMessage(req, res);
      break;
    case 'interactive':
      await handleInteractiveMessage(req, res);
      break;
    default:
      console.log('Not supported message type: ', type);
      break;
  }
  // add to CRM without await.. no need to wait for it
  addToCRM(res);
  // update contact
  const { tagsToAdd, createdBy } = contact;
  await contactsCollection.update(
    { phone: contact.phone },
    { $addToSet: { tags: { $each: tagsToAdd } }, $set: { createdBy } }
  );
  res.locals.waClient.sendStatusUpdate('read', message);
};

async function createContact(req, res) {
  const message = res.locals.message;
  const phone = '+' + message.from;
  const contactsCollection = res.locals.collections.contactsCollection;
  const mobile = phone.slice(3);
  const contact = {
    phone,
    mobile,
    email: '',
    name: '',
    wa_name:
      req.body.entry?.[0].changes?.[0].value?.contacts?.[0].profile.name || '',
    wa_id: req.body.entry?.[0].changes?.[0].value?.contacts?.[0].wa_id,
  };
  contact._id = (await contactsCollection.create(contact)).insertedId;
  return contact;
}

async function addToCRM(res) {
  // Update CRM with the UTM for the campaign
  const { message, utm } = res.locals.crm;
  const contact = res.locals.contact;
  const crmData = {
    source: 'whatsApp LP',
    first_name: contact.name,
    mobile: contact.mobile,
    email: contact.email,
    wa_name: contact.wa_name,
    message: message,
    ...utm,
  };
  if (process.env.ENV === 'PROD') {
    await createCommInCRM(crmData);
  } else {
    //console.log('CRM Entry :', JSON.stringify(crmData));
  }
}

export default handleMessage;
