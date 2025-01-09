import { COURSES, JOIN_NOW } from "../../../../assets/signup_assets.js";
import { FLOW_SIGNUP } from "../../../../helpers/config.js";
import { set } from "../../../../helpers/storage.js";
import generateToken from "../../../../helpers/tokenizer.js";
import { isInTimeRange } from "../../../../helpers/utils.js";
import { getRegistration } from "../../XCD09GCampaignHandlers/handlerFunctions.js";
import { playButton, tryMBAGameButton } from "../common.js";

const handleDefaultCampaignReplyButtonMessage = async function (req, res) {
  const { contact, action: ac, collections, waClient } = res.locals;
  const { name, phone } = contact;
  const body = { text: "" };
  const action = { buttons: [] };
  switch (ac) {
    case "vc": {
      if (name) {
        if (isInTimeRange("10:30", "18:30")) {
          body.text =
            "We have received your request and we will soon contact you with zoom meeting details.";
        } else {
          body.text =
            "Sorry our office is closed right now. We will contact you when it opens.";
        }
        const registered = await getRegistration(
          "XCD09G",
          phone,
          collections.campaignContactsCollection
        );
        if (registered) {
          body.text += `
Meanwhile why don't you play a game`;
          action.buttons = [playButton];
        } else {
          body.text += `
Meanwhile why don't you try our MBA game`;
          action.buttons = [tryMBAGameButton];
        }
        await waClient.sendReplyButtonMessage(phone, { body, action });
      } else {
        body.text = "Please give us your details to schedule a zoom meeting";
        await sendSignUpFlow("VIDCON", body);
      }
      break;
    }
    case "callback":
      if (name) {
        if (isInTimeRange("10:30", "18:30")) {
          body.text =
            "We have received your request and we will soon call you.";
        } else {
          body.text =
            "Sorry our office is closed right now. We will contact you when it opens.";
        }
        const registered = await getRegistration(
          "XCD09G",
          phone,
          collections.campaignContactsCollection
        );
        if (registered) {
          body.text += `
         Meanwhile why don't you play a game`;
          action.buttons = [playButton];
        } else {
          body.text += `
         Meanwhile why don't you try our MBA game`;
          action.buttons = [tryMBAGameButton];
        }
        await waClient.sendReplyButtonMessage(phone, { body, action });
      } else {
        body.text = "Please give us your details to schedule a callback";
        await sendSignUpFlow("RQCALL", body);
      }
      break;
    case "register":
      body.text = "Please tell us more about yourself.";
      await sendSignUpFlow("COMMON", body);
      break;
    default:
      break;
  }
  async function sendSignUpFlow(code, body) {
    // send Sign Up flow message here
    // to get the contact's name
    const token = generateToken(
      JSON.stringify({ phone, code, flow_id: FLOW_SIGNUP })
    );
    const layout = {
      header: {
        type: "text",
        text: "SIGN UP"
      },
      body
    };
    const params = {
      flow_token: token,
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
              id: "cat25",
              title: "CAT 25"
            },
            {
              id: "cat26",
              title: "CAT 26"
            },
            // {
            //   id: "omet25",
            //   title: "OMETs (XAT, NMAT etc)"
            // },
            {
              id: "gmat25",
              title: "GMAT"
            }
          ]
        }
      }
    };
    await waClient.sendFlowMessage(phone, layout, params);
    await set(token, {
      flow_token: token,
      phone,
      code,
      flow_id: FLOW_SIGNUP,
      createdAt: new Date()
    });
  }
};

export default handleDefaultCampaignReplyButtonMessage;
