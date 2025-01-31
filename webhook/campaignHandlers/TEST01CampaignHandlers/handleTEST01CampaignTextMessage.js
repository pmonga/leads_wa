import dotnenv from "dotenv";
//import createCommInCRM from '../../../helpers/crm.js';
import generateToken from "../../../helpers/tokenizer.js";
import { set, get } from "../../../helpers/storage.js";
import { FLOW_SIGNUP } from "../../../helpers/config.js";
import { COURSES, JOIN_NOW } from "../../../assets/signup_assets.js";

dotnenv.config();
export default async (req, res, next) => {
  //const message = res.locals.message;
  const contact = res.locals.contact;
  const phone = contact.phone;
  const code = res.locals.code;
  const campaign = res.locals.campaign;

  //const contactsCollection = res.locals.collections.contactsCollection;
  const campaignsCollection = res.locals.collections.campaignsCollection;

  const playButton = {
    type: "reply",
    reply: {
      id: `XCD09G-play`,
      title: "Play Now"
    }
  };
  const action = {
    buttons: [playButton]
  };

  // send message to contact
  if (contact.name) {
    let registrations = (
      await campaignsCollection.read(
        { _id: campaign._id },
        { projection: { registrations: 1 } }
      )
    )?.[0].registrations;
    if (!registrations) {
      registrations = [];
    }
    let registered = registrations.find((e) => e.phone === contact.phone);
    if (!registered) {
      const { _id, name, mobile, phone, email } = contact;
      registered = {
        _id,
        name,
        mobile,
        phone,
        email,
        regnum: registrations.length + 1
      };
      registrations.push(registered);
      await campaignsCollection.update(
        { _id: campaign._id },
        { $set: { registrations: registrations } }
      );
    }
    let body = {
      text: `Thank you, ${
        registered.name
      }, you are registered for ${campaign.name.toUpperCase()} with mobile number ${
        registered.mobile
      } and your registration id is ${registered.regnum}.

You can also participitate in our scholarship game and win rewards daily.`
    };
    await res.locals.waClient.sendReplyButtonMessage(contact.phone, {
      body,
      action
    });
  } else {
    // send SIGN UP flow message here flow_id: '1760272798116365'
    const flow_id = FLOW_SIGNUP;
    const token = generateToken(JSON.stringify({ phone, code, flow_id }));
    const layout = {
      header: {
        type: "text",
        text: "SIGN UP"
      },
      body: {
        text: `Please register with your full name and email.`
      }
    };
    const params = {
      flow_token: token,
      flow_id, //Lead Sign Up
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
              id: "cat25",
              title: "CAT 25"
            },
            {
              id: "cat26",
              title: "CAT 26"
            },
            {
              id: "gmat25",
              title: "GMAT"
            }
          ]
        }
      }
    };
    await res.locals.waClient.sendFlowMessage(contact.phone, layout, params);
    await set(token, {
      phone,
      code,
      flow_id,
      createdAt: new Date()
    });
  }
};
