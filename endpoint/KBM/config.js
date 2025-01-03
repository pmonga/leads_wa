// KBN Game config.js

// Constants and settings
const APP_NAME = "Kaun Banega MBA";
const VERSION = "1.0.0";
const MAX_ATTEMPTS = 3;
const GAME_QS_DEF = [
  [
    { level: "sample", num: 1 },
    { level: "easy", num: 0 },
    { level: "medium", num: 0 },
    { level: "hard", num: 14 }
  ]
];
const SAMPLE_QS_DEF = [
  { level: "sample", num: 15 },
  { level: "medium", num: 0 },
  { level: "hard", num: 0 }
];
const GAME_TIME = [10 * 60 * 1000, 8 * 60 * 1000, 7 * 60 * 1000]; // 10 minutes in milliseconds
const GAME_PRIZE = [
  [1, 2, 4, 7, 10, 15, 20, 25, 35, 50, 70, 100, 200, 500, 1000]
];
const TERMS = `## 1. Eligibility
1.0. The game is presently in testing mode, so no rewards presently. All credits earned during this phase will be removed in sometime.
1.1. Everybody can participate in this game for fun.
1.2. Participants must be residents of India and between 18 to 25 years of age as of the date of participation to claim reward.
1.3. The name registered for the game must match the name of the reward recipient. No exceptions will be entertained.
1.4. Participation for rewards is restricted to students preparing for CAT 2025 or CAT 2026. Proof of preparation may be requested.
1.5. Participants' details, including name, email ID, and phone number, must match the information provided during registration.

## 2. Gameplay Rules
2.1. Each player can participate thrice per day. Multiple attempts or registrations under different email IDs or phones will result in immediate disqualification.
2.2. Players can only leave the game between questions, not during an ongoing question. Once a question is started, the player must answer it.
2.3. Players must solve each question in the given time. There is no independent or additional time provided for any question.
2.4. An incorrect answer at any stage will result in forfeiture of all accumulated rewards. No appeals or reviews will be allowed.
2.5. The decision to leave the game must be explicitly confirmed by the player within the game interface.

## 3. Rewards
3.1. Rewards are non-negotiable and non-transferable. The participant’s details, including the registered name, email ID, and phone number, must exactly match the name and details provided in the recipient’s bank account or payment method. Students not registered at Alchemist for comprehensive coaching for CAT 25 or CAT 26 may not claim cash rewards more than rupees hundred.
3.2. Players must claim rewards by sending an email to the designated address from their registered email ID.
3.3. Any failure to follow the claim process, including mismatched details, incomplete information, or delayed submissions, will result in forfeiture of the reward.
3.4. Rewards will be processed within 7 working days, but Alchemist and its associates also referred to as the institute in this document reserves the right to delay or cancel payment due to suspected fraud or non-compliance with these terms.

## 4. Institute’s Rights
4.1. The institute reserves the right to suspend, modify, or terminate the game without prior notice.
4.2. All decisions regarding the game, including disputes and rewards, are at the sole discretion of the institute and are final.
4.3. The institute may disqualify any participant at any stage without explanation if it suspects rule violations, fraud, or misuse of the game.
4.4. The institute retains full ownership of the game design, questions, and rules and may alter these terms at any time.

## 5. Conduct and Compliance
5.1. Players must strictly adhere to all rules and regulations of the game.
5.2. Any attempts to manipulate game outcomes, including but not limited to using bots, using multiple accounts, third-party tools, or unauthorized methods, will result in immediate disqualification and possible legal action.
5.3. The institute is not obligated to provide evidence or explanations for disqualification or forfeiture decisions.

## 6. Technical Issues
6.1. The institute is not liable for technical issues such as server downtime, internet connectivity problems, or device malfunctions that may affect gameplay.
6.2. If the game is interrupted or fails to complete due to technical issues, rewards will not be granted, and the game for that day will be considered void.

## 7. Data and Privacy
7.1. By participating, players consent to the collection and use of their gameplay data and email ID for marketing, analytics, and reward processing purposes.
7.2. The user data provided, including name, email ID, and phone number, may be used for promotional activities. Players waive the right to contest the use of such data.
7.3. Personal information will be stored securely but may be shared within the institute’s network for administrative purposes.

## 8. Liability and Indemnity
8.1. By participating in the game, players agree to waive any claims against the institute regarding reward disputes, gameplay issues, or other concerns.
8.2. Players participate at their own risk. The institute is not responsible for any damages, losses, or inconveniences arising from participation in the game.

## 9. Legal Jurisdiction
9.1. Any legal dispute arising from participation in this game will be resolved under the jurisdiction of the courts in Delhi, India.`;

// Export individually
export {
  APP_NAME,
  VERSION,
  GAME_TIME,
  GAME_PRIZE,
  GAME_QS_DEF,
  SAMPLE_QS_DEF,
  TERMS,
  MAX_ATTEMPTS
};
