import dotnenv from "dotenv";
import createCommInCRM from "../../../helpers/crm.js";
import { getRegistration } from "../XCD09GCampaignHandlers/handlerFunctions.js";
import {
  callBackButton,
  playButton,
  registerButton,
  tryMBAGameButton,
  vcButton
} from "./common.js";

dotnenv.config();
export default async (req, res, next) => {
  const { contact, waClient, collections } = res.locals;
  const { name, phone } = contact;
  const action = {
    buttons: []
  };
  const body = {
    text: ""
  };
  if (!name) {
    body.text = `Thank you for contacting *Alchemist*, what will you like to do?
1. Tell us more about yourself
2. Request a call back (10:30-6:30)
3. Take a counselling on Zoom (10:30-6:30)`;
    action.buttons = [registerButton, callBackButton, vcButton];
  } else {
    const registered = await getRegistration(
      "XCD09G",
      phone,
      collections.campaignContactsCollection
    );
    body.text = `Welcome back, ${name}, what will you like to do?
1. Request a call back (10:30-6:30)
2. Take a counselling on Zoom (10:30-6:30)`;
    if (registered) {
      body.text += `
3. Play the game`;
      action.buttons = [callBackButton, vcButton, playButton];
    } else {
      body.text += `
3. Try our game for MBA`;
      action.buttons = [callBackButton, vcButton, tryMBAGameButton];
    }
  }
  // send message to contact
  await waClient.sendReplyButtonMessage(phone, { body, action });

  // let reply = {
  //   body: "Thank you for contacting Alchemist, we will get in touch with you soon"
  // };
  // await waClient.sendTextMessage(contact.phone, reply);
  return;
};
