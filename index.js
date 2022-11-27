const TelegramBot = require('node-telegram-bot-api');

const GoogleSpreadsheet = require('./modules/GoogleSpreadsheet');
const { createDebtsMsgByUser } = require('./utils');

require('dotenv').config();

const MAIN_CHANNEL_ID = '-1001763536285';
// const MAIN_CHANNEL_ID = '-796889453';
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const checkIsGroup = (msg) => {
  return msg.chat.id === +MAIN_CHANNEL_ID || msg.chat.type === 'group';
};

const sendToMain = (text, options) => {
  bot.sendMessage(MAIN_CHANNEL_ID, text, options);
};

const commands = {
  START: 'START',
  PAID_LIST: 'PAID_LIST',
  CLEAR: 'CLEAR',
};

const commandQuery = {
  [commands.START]: '/start',
  [commands.PAID_LIST]: '/list',
  [commands.CLEAR]: '/clear',
};

const descriptions = {
  [commands.START]: 'Начало',
  [commands.PAID_LIST]: 'Мои траты',
  [commands.CLEAR]: 'Очистить траты',
};

bot.setMyCommands(
  Object.keys(commands).map((command) => ({
    command: commandQuery[command],
    description: descriptions[command],
  }))
);

bot.onText(/\/start/, (msg) => {
  if (checkIsGroup(msg)) {
    return;
  }
  const chatId = msg.chat.id;

  const message =
    'Короче, вводи сюда сообщения следующего формата: \n' +
    '<i>[сумма траты] [причина] [место]</i> \n\n' +
    'например:\n' +
    '14 продукты тц';

  bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

bot.onText(/\/clear/, (msg) => {
  if (checkIsGroup(msg)) {
    return;
  }

  const chatId = msg.chat.id;
  const userName = msg.chat.username;

  GoogleSpreadsheet.deactivateDebtByUser(userName)
    .then(() => bot.sendMessage(chatId, `Очистили записи`))
    .catch((err) => bot.sendMessage(chatId, `Неудалось очистить: ${err}`));
});

bot.onText(/\/list/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.chat.username;

  if (checkIsGroup(msg)) {
    GoogleSpreadsheet.getDataByUser().then((rows) => {
      const activeRows = (rows || []).filter((row) => {
        const [msgId, amount, reason, place, date, userName, isActive] = row;
        return isActive === 'TRUE';
      });
      const messageText = createDebtsMsgByUser(activeRows, {
        withUserName: true,
      });
      bot.sendMessage(chatId, messageText, { parse_mode: 'HTML' });
    });
    return;
  }

  try {
    GoogleSpreadsheet.getDataByUser(userName)
      .then((rows) => {
        const activeRows = (rows || []).filter((row) => {
          const [msgId, amount, reason, place, date, userName, isActive] = row;
          return isActive === 'TRUE';
        });
        const messageText = createDebtsMsgByUser(activeRows);
        bot.sendMessage(chatId, messageText, { parse_mode: 'HTML' });
      })
      .catch((err) => bot.sendMessage(chatId, `Ничего не нашлось: ${err}`));
  } catch (err) {
    bot.sendMessage(chatId, 'при получении данных возникла ошибка: ', err);
  }
});

bot.onText(/^(\d+)/gm, (msg) => {
  if (checkIsGroup(msg)) {
    return;
  }

  const chatId = msg.chat.id;
  const msgId = msg.message_id;
  const text = msg.text.split(' ');
  const msgDate = msg.date;
  const userName = msg.chat.username;

  const amount = Number(text[0].replace(',', '.'));
  const reason = text[1];
  const place = text.slice(2, text.length).join(' ');

  const newRow = [msgId, amount, reason, place, msgDate, userName, 'TRUE'];

  GoogleSpreadsheet.writeRow(newRow)
    .then((response) => {
      bot.sendMessage(chatId, `*сохранил*`, { parse_mode: 'MarkdownV2' });
      let msg = `@${userName} добавил чек на сумму ${amount}`;
      if (reason) msg += ` на ${reason}`;
      sendToMain(msg, { disable_notification: true });
    })
    .catch((err) => {
      bot.sendMessage(chatId, 'возникла ошибка при сохранении: ', err);
    });
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const reg = new RegExp(/^(\d+)/, 'gm');
  const isCommand = Object.values(commandQuery).includes(text);
  const isData = reg.test(text);

  if (!isCommand && !isData && !checkIsGroup(msg)) {
    bot.sendMessage(
      chatId,
      'не разобрался, что ты пишешь. попробуй написать /start \n' +
        'шаблон сообщения: [СУММА] [ЦЕЛЬ] [ГДЕ КУПИЛ]\n\n' +
        'пример сообщения: 1000000 машина/продукты марс'
    );
  }
});
