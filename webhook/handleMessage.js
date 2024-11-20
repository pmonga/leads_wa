import handleTextMessage from './messageTypeHandlers/handleTextMessage.js';

const handleMessage = async function (req, res) {
  const type = res.locals.message.type;
  switch (type) {
    case 'text':
      await handleTextMessage(req, res);
      break;
    case 'default':
      console.log('Not supported message type: ', type);
      res.sendStatus(200);
      break;
  }
};

export default handleMessage;
