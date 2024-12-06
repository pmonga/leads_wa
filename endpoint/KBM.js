/*global console*/
import { get, set, del } from "../helpers/storage.js";
import {
  decryptRequest,
  encryptResponse,
  FlowEndpointException
} from "../helpers/encryption.js";
import { FLOW_KBM } from "../helpers/config.js";
import { SAMPLE_GAME } from "./KBM/sample.js";
import { GAME_PRIZE, GAME_TIME } from "./KBM/config.js";
import {
  getTimeWithOffset,
  formatTohhmmDateIST,
  convertKeysToDate
} from "../helpers/utils.js";
import { BACK, CORRECT, TIME_UP, WINNER, WRONG } from "../assets/kbm_assets.js";

// handle initial request when opening the flow
export const getNextScreen = async (req, res, decryptedBody) => {
  const { screen, data, version, action, flow_token } = decryptedBody;
  const flow_obj = convertKeysToDate(
    await get(flow_token),
    "startedAt",
    "end_time",
    "finishedAt"
  );
  const flow_id = { flow_obj };
  if (flow_id != FLOW_KBM) {
    //return with error
  }

  if (action === "BACK") {
    let back_img = BACK.img;
    let back_img_height = BACK.height;
    let back_img_width = BACK.width;
    let back_msg = "Sorry BACK not allowed.";
    return {
      screen: "BACK",
      data: { back_img, back_img_height, back_img_width, back_msg }
    };
  }

  if (action === "data_exchange") {
    // handle the request based on the current screen
    let response;
    switch (screen) {
      case "WELCOME":
        if (flow_obj?.is_back) {
          // implement continue from back logic
        } else {
          const level = 0;
          const cur = 1; //flow_obj?.cur ? flow_obj.cur : 1;
          const prize = GAME_PRIZE?.[level] || GAME_PRIZE[0];
          {
            flow_obj.level = level;
            flow_obj.cur = cur;
            flow_obj.prize = [...prize];
            flow_obj.won = 0;
            flow_obj.time_allowed =
              GAME_TIME?.[level] || GAME_TIME?.[GAME_TIME.length - 1];
            flow_obj.startedAt = new Date();
            flow_obj.end_time = getTimeWithOffset(
              flow_obj.startedAt,
              flow_obj.time_allowed
            );
          }
          if (data.is_sample || flow_obj.is_sample) {
            // implement sample logic here
            flow_obj.is_sample = true;
            flow_obj.questions = [...SAMPLE_GAME];
          } else {
            // implement real game progress logic here;
            flow_obj.is_sample = true;
            flow_obj.questions = [...SAMPLE_GAME];
            // the last_attemptedAT, last_attempt_level needs to be set here in the campaignContacts.
            // update contactQuestions too, so it avoids repetition.
          }

          response = {
            screen: "PRE",
            data: {
              qs_img: flow_obj.questions[flow_obj.cur - 1].qs_img,
              pre_subheading: `Answer next for ${
                flow_obj.prize?.[flow_obj.cur - 1] || 0
              }`,
              pre_quit_label: `I want to quit now and claim ${
                flow_obj.prize?.[flow_obj.cur - 2] || 0
              }`,
              pre_instruction: `Instructions:\n1. Please finish the attempt by ${formatTohhmmDateIST(
                flow_obj.end_time
              )} to win.\n2. The game ends if you answer any question incorrectly and you do not win anything.\n3. You may quit the game on this screen before time is over.\n4. You will not win any points if time runs out.\n5. Do not use the back button as it may interfere with game play.`
            }
          };
        }
        break;
      case "PRE":
        if (flow_obj.is_back) {
          // implement continue from back logic
        } else {
          if (data.has_quit) {
            flow_obj.finishedAt = new Date();
            if (flow_obj.end_time < new Date()) {
              let final_img = TIME_UP.img;
              let final_img_height = TIME_UP.height;
              let final_img_width = TIME_UP.width;
              let final_msg = "Sorry time over. Better luck next time.";
              response = {
                screen: "FINAL",
                data: {
                  final_img,
                  final_img_height,
                  final_img_width,
                  final_msg
                }
              };
            } else {
              let final_img = WINNER.img;
              let final_img_height = WINNER.height;
              let final_img_width = WINNER.width;
              let final_msg = `Congratulations, You have won ${flow_obj.prize?.[flow_obj.cur - 2]}.`;
              response = {
                screen: "FINAL",
                data: {
                  final_img,
                  final_img_height,
                  final_img_width,
                  final_msg
                }
              };
            }
          }
        }
        break;
      case "QS":
        {
          if (flow_obj.end_time < new Date()) {
            flow_obj.finishedAt = new Date();
            let final_img = TIME_UP.img;
            let final_img_height = TIME_UP.height;
            let final_img_width = TIME_UP.width;
            let final_msg = "Sorry time over. Better luck next time.";
            response = {
              screen: "FINAL",
              data: { final_img, final_img_height, final_img_width, final_msg }
            };
          } else if (
            flow_obj.questions?.[flow_obj.cur - 1]?.ans.toUpperCase() ===
            data.ans.toUpperCase()
          ) {
            flow_obj.cur++;
            if (flow_obj.cur > flow_obj.questions.length) {
              flow_obj.finishedAt = new Date();
              let final_img = WINNER.img;
              let final_img_height = WINNER.height;
              let final_img_width = WINNER.width;
              let final_msg = `Congratulations, You have won ${flow_obj.prize?.[flow_obj.prize.length - 1]}.`;
              response = {
                screen: "FINAL",
                data: {
                  final_img,
                  final_img_height,
                  final_img_width,
                  final_msg
                }
              };
            } else {
              const post_title = "Sahi Jawaab!";
              const post_img = CORRECT.img;
              const post_img_height = CORRECT.height;
              const post_msg = `That's correct. You win ${flow_obj.prize?.[flow_obj.cur - 2]}.`;
              response = {
                screen: "POST",
                data: {
                  post_title,
                  post_img,
                  post_img_height,
                  post_msg,
                  qs_img: flow_obj.questions[flow_obj.cur - 1].qs_img,
                  pre_subheading: `Answer next for ${
                    flow_obj.prize?.[flow_obj.cur - 1] || 0
                  }`,
                  pre_quit_label: `I want to quit now and claim ${
                    flow_obj.prize?.[flow_obj.cur - 2] || 0
                  }`,
                  pre_instruction: `Instructions:\n1. Please finish the attempt by ${formatTohhmmDateIST(
                    flow_obj.end_time
                  )} to win.\n2. The game ends if you answer any question incorrectly and you do not win anything.\n3. You may quit the game on this screen before time is over.\n4. You will not win any points if time runs out.\n5. Do not use the back button as it may interfere with game play.`
                }
              };
            }
          } else {
            {
              flow_obj.finishedAt = new Date();
              let final_img = WRONG.img;
              let final_img_height = WRONG.height;
              let final_img_width = WRONG.width;
              let final_msg = `Sorry, that's incorrect. Better luck next time.`;
              response = {
                screen: "FINAL",
                data: {
                  final_img,
                  final_img_height,
                  final_img_width,
                  final_msg
                }
              };
            }
          }
        }
        break;
      // send success response to complete and close the flow
      // return {
      //   screen: 'SUCCESS',
      //   data: {
      //     extension_message_response: {
      //       params: {
      //         flow_token,
      //       },
      //     },
      //   },
      // };
      case "BACK":
        return {
          screen: data.screen,
          data: {}
        };
      //break;
      default:
        break;
    }
    await set(flow_token, flow_obj);
    return response;
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error(
    "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
  );
};
