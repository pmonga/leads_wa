/* global console, setTimeout, Promise, clearTimeout */
import { get, set, del } from "../helpers/storage.js";
import {
  decryptRequest,
  encryptResponse,
  FlowEndpointException
} from "../helpers/encryption.js";
import { FLOW_KBM } from "../helpers/config.js";
//import { SAMPLE_GAME } from "./KBM/sample.js";
import {
  GAME_PRIZE,
  GAME_QS_DEF,
  GAME_TIME,
  MAX_ATTEMPTS,
  SAMPLE_QS_DEF
} from "./KBM/config.js";
import {
  getTimeWithOffset,
  formatTohhmmDateIST,
  convertKeysToDate,
  isSameDate
} from "../helpers/utils.js";
import { BACK, CORRECT, TIME_UP, WINNER, WRONG } from "../assets/kbm_assets.js";
import { getRegistration } from "../webhook/campaignHandlers/XCD09GCampaignHandlers/handlerFunctions.js";

// handle initial request when opening the flow
export const getNextScreen = async (req, res, decryptedBody) => {
  const { screen, data, action, flow_token } = decryptedBody;
  const {
    gameStatsCollection,
    kbmQs,
    contactKbmQs,
    campaignContactsCollection
  } = res.locals.collections;
  let flow_obj = await get(flow_token);
  if (!flow_obj) {
    console.log("in kbm.js: line 37 ", flow_obj);
    return {
      screen: "SUCCESS",
      data: {
        extension_message_response: {
          params: {
            flow_token
          }
        }
      }
    };
  }
  flow_obj = convertKeysToDate(flow_obj, "startedAt", "end_time", "finishedAt");
  const flow_id = { flow_obj };
  if (flow_id != FLOW_KBM) {
    console.log("in kbm.js: line 52 ", flow_obj);
    return {
      screen: "SUCCESS",
      data: {
        extension_message_response: {
          params: {
            flow_token
          }
        }
      }
    };
  }
  const { code, phone, campaign_contact_id, is_sample, contact_id } = flow_obj;
  const registered = await getRegistration(
    code,
    phone,
    campaignContactsCollection
  );
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
        {
          if (
            registered.lastAttemptedAt &&
            isSameDate(new Date(registered.lastAttemptedAt)) &&
            registered?.lastDayAttempts?.length >= MAX_ATTEMPTS
          ) {
            console.log("in welcome switch kbm.js: ", flow_obj);
            return {
              screen: "SUCCESS",
              data: {
                extension_message_response: {
                  params: {
                    flow_token
                  }
                }
              }
            };
          }
          const difficulty_level = flow_obj?.difficulty_level || 0;
          const cur = 1; //flow_obj?.cur ? flow_obj.cur : 1;
          const prize = GAME_PRIZE?.[difficulty_level] || GAME_PRIZE[0];
          let qsDef =
            GAME_QS_DEF?.[difficulty_level] ||
            GAME_QS_DEF[GAME_QS_DEF.length - 1];
          let promises = [];
          flow_obj.cur = cur;
          flow_obj.won = 0;
          flow_obj.prize = [...prize];
          flow_obj.time_allowed =
            GAME_TIME?.[difficulty_level] || GAME_TIME?.[GAME_TIME.length - 1];
          flow_obj.startedAt = new Date();
          flow_obj.end_time = getTimeWithOffset(
            flow_obj.startedAt,
            flow_obj.time_allowed
          );

          if (data.is_sample) {
            flow_obj.is_sample = true;
            qsDef = SAMPLE_QS_DEF;
          } else {
            flow_obj.is_sample = false;
            qsDef =
              GAME_QS_DEF?.[difficulty_level] ||
              GAME_QS_DEF[GAME_QS_DEF.length - 1];
            // if attempt is on the same day
            if (
              isSameDate(
                registered.lastAttemptedAt &&
                  isSameDate(registered?.lastAttemptedAt)
              )
            ) {
              promises.push(
                campaignContactsCollection.update(
                  { _id: campaign_contact_id },
                  {
                    $set: {
                      lastAttemptedAt: flow_obj.startedAt
                    },
                    $push: { lastDayAttempts: flow_token }
                  }
                )
              );
            } else {
              promises.push(
                campaignContactsCollection.update(
                  { _id: campaign_contact_id },
                  {
                    $set: {
                      lastAttemptedAt: flow_obj.startedAt,
                      lastDayAttempts: [flow_token],
                      lastDayWins: 0,
                      lastDayWinToken: ""
                    }
                  }
                )
              );
            }
          }
          promises = promises.concat([
            buildQsSet(qsDef, phone, kbmQs.collection()),
            gameStatsCollection.update(
              { flow_token },
              {
                $set: {
                  is_sample: flow_obj.is_sample,
                  startedAt: flow_obj.startedAt,
                  end_time: flow_obj.end_time
                }
              }
            )
          ]);
          [, flow_obj.questions] = await Promise.all(promises);
          const qs_img = await getQsImg(flow_obj.cur - 1);
          flow_obj.questions[flow_obj.cur - 1].createdAt = new Date();
          response = {
            screen: "PRE",
            data: {
              cur: `Q${flow_obj.cur}`,
              qs_img,
              pre_subheading: `Answer next for ${
                flow_obj.prize?.[flow_obj.cur - 1] || 0
              }`,
              pre_instruction: `Instructions:\n1. Please finish the attempt by **${formatTohhmmDateIST(
                flow_obj.end_time
              )}** to win.\n2. The game ends if you answer any question incorrectly and you do not win anything.\n3. You may quit the game on this screen before time is over.\n4. You will not win any points if time runs out.\n5. Do not use the back button as it may interfere with game play.`
            }
          };
        }
        break;
      case "POST":
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
            flow_obj.won = flow_obj.is_sample
              ? 0
              : flow_obj.prize?.[flow_obj.cur - 2];
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
        break;
      case "QS":
        {
          // update the collection contact questions to mark question as used
          if (!is_sample) {
            flow_obj.questions[[flow_obj.cur - 1]].response = data?.ans;
            flow_obj.questions[[flow_obj.cur - 1]].is_correct =
              flow_obj.questions?.[flow_obj.cur - 1]?.ans.toUpperCase() ===
              data?.ans?.toUpperCase();
            contactKbmQs.create({
              kbm_question_id: flow_obj.questions[[flow_obj.cur - 1]]._id,
              campaign_contact_id,
              flow_token,
              contact_id,
              phone,
              ans: flow_obj.questions[[flow_obj.cur - 1]].ans,
              response: flow_obj.questions[[flow_obj.cur - 1]].response,
              is_correct: flow_obj.questions[[flow_obj.cur - 1]].is_correct,
              createdAt: flow_obj.questions[[flow_obj.cur - 1]].createdAt
            });
          }
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
            if (++flow_obj.cur > flow_obj.questions.length) {
              flow_obj.finishedAt = new Date();
              let final_img = WINNER.img;
              let final_img_height = WINNER.height;
              let final_img_width = WINNER.width;
              let final_msg = `Congratulations, You have won ${flow_obj.prize?.[flow_obj.cur - 2]}.`;
              flow_obj.won = flow_obj.is_sample
                ? 0
                : flow_obj.prize?.[flow_obj.cur - 2];
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
              const post_title = "Correct Answer";
              const post_img = CORRECT.img;
              const post_img_height = CORRECT.height;
              const post_msg = `That's right. You win ${flow_obj.prize?.[flow_obj.cur - 2]}.`;
              response = {
                screen: "POST",
                data: {
                  cur: `Q${flow_obj.cur}`,
                  post_title,
                  post_img,
                  post_img_height,
                  post_msg,
                  qs_img: await getQsImg(flow_obj.cur - 1),
                  pre_subheading: `Answer next for ${
                    flow_obj.prize?.[flow_obj.cur - 1] || 0
                  }`,
                  post_quit_label: `I want to quit now and claim ${
                    flow_obj.prize?.[flow_obj.cur - 2] || 0
                  }`,
                  pre_instruction: `Instructions:\n1. Please finish the attempt by **${formatTohhmmDateIST(
                    flow_obj.end_time
                  )}** to win.\n2. The game ends if you answer any question incorrectly and you do not win anything.\n3. You may quit the game on this screen before time is over.\n4. You will not win any points if time runs out.\n5. Do not use the back button as it may interfere with game play.`
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
      case "BACK":
        return {
          screen: data.screen,
          data: {}
        };
      //break;
      default:
        break;
    }
    if (flow_obj.finishedAt && flow_obj.won > 0) {
      const { questions, ...details } = flow_obj;
      const entry = {
        type: "convertible",
        changes: { total: flow_obj.won },
        description: "KBM game winnings",
        details
      };
      flow_obj.entry = entry;
    }
    await set(flow_token, flow_obj);
    return response;
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error(
    "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
  );
  async function getQsImg(i) {
    const { questions } = flow_obj;
    const img = (
      await kbmQs.read({ _id: questions?.[i]._id }, { projection: { img: 1 } })
    )?.[0].img;
    questions[i].createdAt = new Date();
    return img;
  }
};

//helper functions below

async function buildQsSet(def, phone, qsCol) {
  let q = [];
  for (const e of def) {
    let newQ = await getQs(e.level, e.num, phone, qsCol);
    q = [...q, ...newQ];
  }
  return q;
}

async function getQs(level, num, phone, mainCollection) {
  console.log("level, num: ", level, num);
  const referenceCollectionName = "wa_contact_kbm_questions";
  try {
    let qs = [];
    let correctCount = 0;
    let usedTimes = 0;
    // add a fail safe for while loop
    let failed = false;
    const failsafe = setTimeout(() => {
      failed = true; // Force condition to end
      console.error(
        "Failsafe triggered: Exiting loop at KBM.js; getQs: ",
        level,
        num,
        phone
      );
    }, 5000);

    //
    while (qs.length < num && !failed) {
      // Aggregation pipeline
      const pipeline = [
        {
          $match: {
            level // Apply filters on indexed fields here
          }
        },
        {
          $lookup: {
            from: referenceCollectionName,
            let: { id: "$_id" }, // Define a variable for `_id` in the source
            pipeline: [
              {
                $match: {
                  $and: [
                    { $expr: { $eq: ["$kbm_question_id", "$$id"] } },
                    { $expr: { $eq: ["$phone", phone] } }
                  ] // Match `reference_id` with `_id` from the source
                }
              }
            ],
            as: "references"
          }
        },
        {
          $match: {
            references: { $size: usedTimes }
          }
        },
        {
          $addFields: {
            num_of_correct: {
              $size: {
                $filter: {
                  input: "$references", // References array
                  as: "ref", // Variable for each element
                  cond: { $eq: ["$$ref.is_correct", true] }
                }
              }
            }
          }
        },
        {
          $match: { num_of_correct: correctCount }
        },
        {
          $sample: { size: num - qs.length }
        },
        {
          $project: {
            ans: 1
          }
        }
      ];
      qs = [...qs, ...(await mainCollection.aggregate(pipeline).toArray())];
      if (correctCount < usedTimes) correctCount++;
      else {
        usedTimes++;
        correctCount = 0;
      }
    }
    if (failed) return [];
    clearTimeout(failsafe);
    console.log("Random Unreferenced Documents:", qs);
    return qs;
  } catch (error) {
    console.error("Error fetching documents:", error);
  }
}
