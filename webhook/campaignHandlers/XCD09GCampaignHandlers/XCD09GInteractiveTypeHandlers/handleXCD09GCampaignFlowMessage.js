import dotnenv from "dotenv";
import generateToken from "../../../../helpers/tokenizer.js";
import { set, get, del } from "../../../../helpers/storage.js";
import { FLOW_KBM, FLOW_SIGNUP } from "../../../../helpers/config.js";
import { isSameDate } from "../../../../helpers/utils.js";
import { WELCOME } from "../../../../assets/kbm_assets.js";
import { signUp } from "../../../../flows/flowSignUpFunctions.js";
import {
  getRegistration,
  register,
  sendRegistrationMessage,
  sendPostGameMessage,
  sendKBMFlow
} from "../handlerFunctions.js";

dotnenv.config();
export default async (req, res) => {
  const code = res.locals.code;
  const campaign = res.locals.campaign;
  const contact = res.locals.contact;

  const {
    contactsCollection,
    campaignContactsCollection,
    gameStatsCollection
  } = res.locals.collections;
  //const campaignsCollection = res.locals.collections.campaignsCollection;

  const { flow_data, flow_token, flow_obj, waClient } = res.locals;
  if (flow_obj.phone != contact.phone) {
    let reply = {
      body: "Sorry, Incorrect parameters. Please try again later."
    };
    await del(res.locals.flow_token);
    await res.locals.waClient.sendTextMessage(contact.phone, reply);
    return;
  }
  switch (flow_obj.flow_id) {
    case FLOW_SIGNUP: {
      if (!contact.name) {
        await signUp(res);
      }
      // get registration details
      let registered = await getRegistration(
        code,
        contact.phone,
        campaignContactsCollection
      );
      if (!registered) {
        registered = await register(res);
      }
      //send wa reply to contact
      if (registered) {
        await sendRegistrationMessage(registered, res);
        // send KBM flow
        await sendKBMFlow(registered, res);
      } else {
        await res.locals.waClient.sendTextMessage(contact.phone, {
          body: `Sorry something went wrong, please try again later`
        });
        throw new Error(`Registration failed for campaign: ${code}`);
      }
      break;
    }
    case FLOW_KBM: {
      const { flow_token, flow_obj } = res.locals;
      const wallet = { ...res.locals.contact.wallet };
      const { ledgerCollection } = res.locals.collections;
      // update game stats
      await gameStatsCollection.update(
        { flow_token },
        { $set: { won: flow_obj.won, finishedAt: flow_obj.finishedAt } }
      );

      // update difficulty level of the registered contact based on performance
      const registered = await getRegistration(
        code,
        contact.phone,
        campaignContactsCollection
      );
      if (registered) {
        //const { difficulty_level, cur } = { flow_obj };
        // if (cur > 10) {
        //   await campaignContactsCollection.update(
        //     { _id: registered._id },
        //     { $set: { difficulty_level: difficulty_level + 1 } }
        //   );
        // }

        // update winnings if applicable
        if (flow_obj.won > registered.lastDayWins) {
          const entries = [
            {
              type: "convertible",
              changes: { total: flow_obj.won },
              description: "KBM game winnings",
              flow_token
            }
          ];
          if (registered.lastDayWins) {
            entries.push({
              type: "convertible",
              changes: { used: registered.lastDayWins },
              description: "reverse previous highest winning",
              flow_token: registered?.lastDayWinToken
            });
          }
          for (const entry of entries) {
            const { type, changes } = entry;
            for (const k in changes) {
              wallet[type][k] += changes[k];
            }
            res.locals.contact.fieldsToUpdate.wallet = wallet;
            await ledgerCollection.create({
              contact_id: contact._id,
              phone: contact.phone,
              name: contact.name,
              entry: flow_obj?.entry
            });
          }
        }
        await Promise.all([
          sendPostGameMessage(registered, wallet, flow_obj, waClient),
          campaignContactsCollection.update(
            { _id: registered._id },
            {
              $set: {
                lastDayWins:
                  flow_obj.won > registered.lastDayWins
                    ? flow_obj.won
                    : registered.lastDayWins,
                lastDayWinToken:
                  flow_obj.won > registered.lastDayWins
                    ? flow_token
                    : registered.lastDayWinToken
              },
              $unset: {
                active_flow_token: "",
                active_flow_message_id: ""
              }
            }
          )
        ]);
        // setTimeout(async () => {
        //   await sendKBMFlow(registered, res);
        // }, 5 * 1000);
      }
      break;
    }
  }
  // clean up, remove the token
  await del(flow_token);
};
/*global setTimeout Promise console*/
