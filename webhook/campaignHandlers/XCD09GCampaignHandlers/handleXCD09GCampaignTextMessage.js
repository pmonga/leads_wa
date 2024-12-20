import dotnenv from "dotenv";
import generateToken from "../../../helpers/tokenizer.js";
import { set, get, del } from "../../../helpers/storage.js";
import { convertKeysToDate, isSameDate } from "../../../helpers/utils.js";
import { FLOW_KBM, FLOW_SIGNUP } from "../../../helpers/config.js";
import { WELCOME } from "../../../assets/kbm_assets.js";
import { COURSES, JOIN_NOW } from "../../../assets/signup_assets.js";

dotnenv.config();
export default async (req, res, next) => {
  const message = res.locals.message;
  const contact = res.locals.contact;
  const code = res.locals.code; // should be 'XCD09G';
  const campaign = res.locals.campaign;
  const phone = contact.phone;
  const contactsCollection = res.locals.collections.contactsCollection;
  const campaignsCollection = res.locals.collections.campaignsCollection;
  const campaignContactsCollection =
    res.locals.collections.campaignContactsCollection;

  // check if contact has already provided name && registered for the game;
  if (contact.name) {
    let registered = (
      await campaignContactsCollection.read(
        { code, phone },
        {
          projection: {
            _id: 1,
            name: 1,
            code: 1,
            phone: 1,
            last_attemptedAt: 1,
            last_attempt_level: 1,
            active_flow_token: 1
          }
        }
      )
    )?.[0];
    // if not registered then register now
    if (!registered) {
      registered = {
        campaign_id: campaign._id,
        code,
        contact_id: contact._id,
        name: contact.name,
        phone,
        mobile: contact.mobile
      };
      registered._id = (
        await campaignContactsCollection.create(registered)
      ).insertedId;
      let reply = {
        body: `Thank you, ${
          registered.name
        }, you are registered for ${campaign.name.toUpperCase()} with mobile number ${
          registered.phone
        }`
      };
      res.locals.waClient.sendTextMessage(contact.phone, reply);
    }
    // send the KBM flow message for KBM flow_id = 1214667192982073
    // check if has already played the game today
    if (
      registered.last_attemptedAt &&
      isSameDate(new Date(registered.last_attemptedAt))
    ) {
      res.locals.waClient.sendTextMessage(contact.phone, {
        body: `You have already played the game today. Please try again tomorrow `
      });
    } else {
      //check if there is a previously active flow token
      if (registered?.active_flow_token) {
        let kbm_flow_obj = await get(registered.active_flow_token);
        if (kbm_flow_obj) {
          kbm_flow_obj = convertKeysToDate(
            kbm_flow_obj,
            "startedAt",
            "end_time",
            "finishedAt"
          );
          // that previous has a valid started game not yet expired or ended.
          if (kbm_flow_obj?.end_time >= new Date()) {
            res.locals.waClient.sendTextMessage(contact.phone, {
              body: `You already have a game in progress, please finish it or wait for it to expire.`
            });
            return;
          }
          // delete the existing flow_token
          await del(registered.active_flow_token);
        }
      }
      // setup a new flow_token and make ready to send flow
      const flow_id = FLOW_KBM;
      const flow_obj = { phone, code, flow_id, createdAt: new Date() };
      const token = generateToken(JSON.stringify(flow_obj));
      const layout = {
        header: {
          type: "text",
          text: "Flow message header"
        },
        body: {
          text: "Flow message body"
        },
        footer: {
          text: "Flow message footer"
        }
      };
      const params = {
        flow_token: token,
        mode: "draft",
        flow_id, //KBM
        flow_cta: "Play Now",
        flow_action: "navigate",
        flow_action_payload: {
          screen: "WELCOME",
          data: { welcome_img: WELCOME.img }
        }
      };
      await res.locals.waClient.sendFlowMessage(contact.phone, layout, params);
      await set(token, flow_obj);
      await campaignContactsCollection.update(
        { _id: registered._id },
        { $set: { active_flow_token: token } }
      );
    }
  } else {
    // send Sign Up flow message here
    // to get the contact's name
    const token = generateToken(
      JSON.stringify({ phone, code, flow_id: FLOW_SIGNUP })
    );
    const layout = {
      header: {
        type: "text",
        text: "Flow message header"
      },
      body: {
        text: "Flow message body"
      },
      footer: {
        text: "Flow message footer"
      }
    };
    const params = {
      flow_token: token,
      mode: "draft",
      flow_id: FLOW_SIGNUP, //Lead Sign Up
      flow_cta: "Register",
      flow_action: "navigate",
      flow_action_payload: {
        screen: "JOIN_NOW",
        data: {
          join_now_img: JOIN_NOW.img,
          join_now_img_height: JOIN_NOW.height,
          courses_img: COURSES.img,
          courses_img_height: COURSES.height,
          courses: [
            {
              id: "cat",
              title: "CAT"
            },
            {
              id: "omet",
              title: "OMETs (XAT, NMAT etc)"
            },
            {
              id: "gmat",
              title: "GMAT"
            }
          ]
        }
      }
    };
    await res.locals.waClient.sendFlowMessage(contact.phone, layout, params);
    await set(token, {
      flow_token: token,
      phone,
      code,
      flow_id: FLOW_SIGNUP,
      created: new Date()
    });
  }
};
