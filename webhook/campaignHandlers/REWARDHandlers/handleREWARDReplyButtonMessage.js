import { FLOW_CLAIM } from "../../../helpers/config";
import { set } from "../../../helpers/storage";
import generateToken from "../../../helpers/tokenizer";

const handleREWARDReplyButtonMessage = async function (req, res) {
  const { code, action, payload: ledger_id, contact, waClient } = res.locals;
  const { contactsCollection, ledgerCollection, payers } =
    res.locals.collections;
  const claimButton = {
    type: "reply",
    reply: {
      id: `REWARD-claim`,
      title: "Claim Reward"
    }
  };
  const paidButton = {
    type: "reply",
    reply: {
      id: `REWARD-pay`,
      title: "Pay Now"
    }
  };
  const denyButton = {
    type: "reply",
    reply: {
      id: `REWARD-deny`,
      title: "Deny Reward"
    }
  };
  // const payer = (await payers.read({ is_active: true }))?.[0];
  // if (!payer) {
  //   await waClient.sendTextMessage(phone, {
  //     body: `Something went wrong, please try again later.`
  //   });
  //   throw new Error("PAYER Error: No active payer found");
  // }
  switch (action) {
    case "claim":
      await claim();
      break;
    case "pay":
      await pay();
      break;
    case "deny":
      break;
  }
  async function claim() {
    const { _id, phone, name, wallet, upi } = contact;
    const pending = (
      await ledgerCollection.read({ contact_id: _id, status: "pending" })
    )?.[0];
    if (pending) {
      await waClient.sendTextMessage(phone, {
        body: `You already have a pending transaction with ref id : ${JSON.stringify(pending._id)}. Please wait for it to be processed.`
      });
      return;
    }
    const flow_id = FLOW_CLAIM;
    const { total, used, converted } = wallet.convertible;
    const claimed = used + converted;
    const flow_obj = { name, phone, code, flow_id, createdAt: new Date() };
    const flow_token = generateToken(JSON.stringify(flow_obj));
    const layout = {
      header: {
        type: "text",
        text: "CLAIM REWARD"
      },
      body: {
        text: `Please fill up the claim form.
You will need to fill your UPI Id if not given earlier. Keep it ready.
You may need to provide KYC and other details if required.`
      }
    };
    const params = {
      flow_token,
      flow_id, //FLOW_CLAIM
      flow_cta: "Fill Claim Form",
      flow_action: "navigate",
      flow_action_payload: {
        screen: "CLAIM_SCREEN",
        data: {
          name,
          total,
          claimed,
          upi: upi ? upi : "false"
        }
      }
    };
    await res.locals.waClient.sendFlowMessage(phone, layout, params);
    await set(flow_token, flow_obj, 2 * 60 * 1000);
    return;
  }
  async function pay() {
    const { message } = res.locals;
    const ledger = (await ledgerCollection.read({ _id: ledger_id }))?.[0];
    if (!ledger?.status || ledger.status !== "pending") {
      await waClient.sendTextMessage(message.from, {
        body: `This transaction has already been completed or not found`
      });
      return;
    }
    const payer = (await payers.read({ is_active: true }))?.[0];
    if (payer.phone != "+" + message.from) {
      await waClient.sendTextMessage(message.from, {
        body: `You are not allowed to do this transaction`
      });
      console.warn("PAYER Error: Unauthorised person tried transaction");
      return;
    }
    const [upi, amount] = ledger.entry.description.split("-");
    try {
      await ledgerCollection.update(
        { _id: ledger_id },
        { $set: { status: "completed" } }
      );
      await waClient.sendTextMessage(message.from, {
        body: `Please pay ${amount} to ${upi}`
      });
    } catch (e) {
      await waClient.sendTextMessage(message.from, {
        body: `Something went wrong ledger id: ${ledger_id}
error: ${e}`
      });
      return;
    }
    await waClient.sendTextMessage(ledger.phone, {
      body: `Your payment for INR ${amount} has been processed. If not received please contact game.master@alchemistindia.com after 24 hours.`
    });
  }
  async function deny() {
    const { message } = res.locals;
    const ledger = (await ledgerCollection.read({ _id: ledger_id }))?.[0];
    if (!ledger?.status || ledger.status !== "pending") {
      await waClient.sendTextMessage(message.from, {
        body: `This transaction has already been completed or not found`
      });
      return;
    }
    const payer = (await payers.read({ is_active: true }))?.[0];
    if (payer.phone != "+" + message.from) {
      await waClient.sendTextMessage(message.from, {
        body: `You are not allowed to do this transaction`
      });
      console.warn("PAYER Error: Unauthorised person tried transaction");
      return;
    }
    const [upi, amount] = ledger.entry.description.split("-");
    const payee = (await contactsCollection.read({ phone: ledger.phone }))?.[0];
    try {
      const wallet = payee.wallet;
      const type = "convertible";
      const changes = { converted: -1 * amount };
      const description = `${ledger._id}-reverse deny claim`;
      const entry = { type, changes, description };
      for (const k in changes) {
        wallet[type][k] += changes[k];
      }
      await contactsCollection.update(
        { _id: payee._id },
        { $set: { wallet: wallet } }
      );
      await ledgerCollection.create({
        contact_id: payee._id,
        phone: payee.phone,
        name: payee.name,
        entry,
        status: "completed"
      });

      await ledgerCollection.update(
        { _id: ledger_id },
        { $set: { status: "completed" } }
      );
      await waClient.sendTextMessage(message.from, {
        body: `Claim denied and message sent to ${ledger.name} on ${ledger.phone}`
      });
    } catch (e) {
      await waClient.sendTextMessage(message.from, {
        body: `Something went wrong ledger id: ${ledger_id}
error: ${e}`
      });
      return;
    }
    await waClient.sendTextMessage(ledger.phone, {
      body: `Your claim for Rs ${amount} has been denied. Please contact game.master@alchemistindia.com for details.`
    });
  }
};
export default handleREWARDReplyButtonMessage;
/* globals console */
