import dotnenv from "dotenv";
import generateToken from "../../../helpers/tokenizer.js";
import { set, get, del } from "../../../helpers/storage.js";
import { convertKeysToDate, isSameDate } from "../../../helpers/utils.js";
import { FLOW_KBM, FLOW_SIGNUP } from "../../../helpers/config.js";
import { WELCOME } from "../../../assets/kbm_assets.js";
import { COURSES, JOIN_NOW } from "../../../assets/signup_assets.js";
import {
  getRegistration,
  register,
  sendKBMFlow,
  sendSignUpFlow,
  sendRegistrationMessage
} from "./handlerFunctions.js";

dotnenv.config();
export default async (req, res, next) => {
  const message = res.locals.message;
  const contact = res.locals.contact;
  const code = res.locals.code; // should be 'XCD09G';
  const campaign = res.locals.campaign;
  const phone = contact.phone;
  const { campaignContactsCollection, gameStatsCollection } =
    res.locals.collections;

  // check if contact has already provided name && registered for the game;
  if (contact.name) {
    let registered = await getRegistration(
      code,
      phone,
      campaignContactsCollection
    );
    // if not registered then register now
    if (!registered) {
      registered = await register(res);
      if (registered) {
        await sendRegistrationMessage(registered, res);
      } else {
        await res.locals.waClient.sendTextMessage(contact.phone, {
          body: `Sorry something went wrong, please try again later`
        });
        throw new Error(`Registration failed for campaign: ${code}`);
      }
    }
    // send KBM flow message
    await sendKBMFlow(registered, res);
  } else {
    await sendSignUpFlow(res);
  }
};
