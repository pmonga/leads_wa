import dotnenv from "dotenv";
import createCommInCRM from "../../../helpers/crm.js";

dotnenv.config();
export default async (req, res, next) => {
  const { contact, waClient, collections } = res.locals.contact;
  // send message to contact
  let reply = {
    body: "Thank you for contacting Alchemist, we will get in touch with you soon"
  };
  await waClient.sendTextMessage(contact.phone, reply);
  return;
};
