import handleInteractiveMessage from './messageTypeHandlers/handleInteractiveMessage.js';
import handleTextMessage from './messageTypeHandlers/handleTextMessage.js';
import handleFlowMessage from './messageTypeHandlers/interactiveTypeHandlers/handleFlowMessage.js';

const handleMessage = async function (req, res) {
  const type = res.locals.message.type;
  console.log('handleMessage switch type:', type);
  switch (type) {
    case 'text':
      await handleTextMessage(req, res);
      break;
    case 'interactive':
      await handleInteractiveMessage(req, res);
      break;
    default:
      console.log('Not supported message type: ', type);
      res.sendStatus(200);
      break;
  }
};

export default handleMessage;
