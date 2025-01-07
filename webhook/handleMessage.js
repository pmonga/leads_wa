/*global console*/
/*global process*/

import dotnenv from "dotenv";
import handleInteractiveMessage from "./messageTypeHandlers/handleInteractiveMessage.js";
import handleTextMessage from "./messageTypeHandlers/handleTextMessage.js";
import createCommInCRM from "../helpers/crm.js";

dotnenv.config();
const handleMessage = async function (req, res) {
  const message = res.locals.message;

  // check if message is from a valid Indian number if not then return without doing anything
  if (!/^91/.test(message.from)) {
    res.locals.waClient.sendStatusUpdate("read", message);
    return;
  }

  const type = res.locals.message.type;
  const phone = "+" + message.from;
  const contactsCollection = res.locals.collections.contactsCollection;

  const contact =
    (await contactsCollection.read({ phone }))?.[0] ||
    (await createContact(req, res));
  contact.tagsToAdd = [];
  contact.lastMessageReceivedAt = new Date(message.timestamp);
  contact.fieldsToUpdate = {
    lastMessageReceivedAt: contact.lastMessageReceivedAt
  };
  res.locals.contact = contact;

  // Save the message in messages collection
  res.locals.collections.messagesCollection.create({
    contact_id: contact._id,
    message_object: { ...req.body }
  });

  console.log("handleMessage switch type:", type);
  switch (type) {
    case "text":
      await handleTextMessage(req, res);
      break;
    case "interactive":
      await handleInteractiveMessage(req, res);
      break;
    default:
      console.log("Not supported message type: ", type);
      break;
  }
  // add to CRM without await.. no need to wait for it
  addToCRM(res);
  // update contact
  // All tags in uppercase to avoid search defeciency
  // const tagsToAdd = contact.tagsToAdd.map(function (x) {
  //   return x.toUpperCase();
  // });
  if (contact.tagsToAdd.length || Object.keys(contact.fieldsToUpdate).length) {
    await contactsCollection.update(
      { phone: contact.phone },
      {
        $addToSet: { tags: { $each: contact.tagsToAdd } },
        $set: { ...contact.fieldsToUpdate }
      }
    );
  }
  res.locals.waClient.sendStatusUpdate("read", message);
};

async function createContact(req, res) {
  const message = res.locals.message;
  const phone = "+" + message.from;
  const contactsCollection = res.locals.collections.contactsCollection;
  const mobile = phone.slice(3);
  const contact = {
    name: "",
    phone,
    mobile,
    email: "",
    wallet: {
      convertible: { total: 0, used: 0, converted: 0 },
      non_convertible: { total: 0, used: 0 }
    },
    wa_name:
      req.body.entry?.[0].changes?.[0].value?.contacts?.[0].profile.name || "",
    wa_id: req.body.entry?.[0].changes?.[0].value?.contacts?.[0].wa_id
  };
  contact._id = (await contactsCollection.create(contact)).insertedId;
  contact.isNew = true;
  return contact;
}

async function addToCRM(res) {
  // Update CRM with the UTM for the campaign
  const { message, utm } = res.locals.crm;
  const contact = res.locals.contact;
  const crmData = {
    source: "whatsApp",
    name: contact.name,
    mobile: contact.mobile,
    email: contact.email,
    wa_name: contact.wa_name,
    message: message,
    ...utm
  };
  if (process.env.ENV === "PROD") {
    await createCommInCRM(crmData);
  } else {
    console.log("CRM Entry :", JSON.stringify(crmData));
  }
}

export default handleMessage;
