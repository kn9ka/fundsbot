const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const format = require('date-fns/format');
const ruLocale = require('date-fns/locale/ru');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const EXPENSES_DIR = './expenses';
const EXPENSES_FILENAME = 'expenses.json';
const FULL_PATH = path.resolve(EXPENSES_DIR, EXPENSES_FILENAME);

const checkIsGroup = (msg) => msg.chat.type === 'group';

const sendToMain = (text, options) => {
  const MAIN_CHANNEL_ID = '-796889453';
  bot.sendMessage(MAIN_CHANNEL_ID, text, options);
};

if (!fs.existsSync(EXPENSES_DIR)) {
  fs.mkdirSync(EXPENSES_DIR);
}

const commands = {
  START: 'START',
  PAID_LIST: 'PAID_LIST',
  CLEAR: 'CLEAR',
  COMMAND_LIST: 'COMMAND_LIST',
};

const commandQuery = {
  [commands.START]: '/start',
  [commands.PAID_LIST]: '/list',
  [commands.CLEAR]: '/clear',
  [commands.COMMAND_LIST]: '/commands',
};

const descriptions = {
  [commands.START]: 'Начало',
  [commands.PAID_LIST]: 'Мои траты',
  [commands.CLEAR]: 'Очистить траты',
  [commands.COMMAND_LIST]: 'Список функций',
};

bot.setMyCommands(
  Object.keys(commands).map((command) => ({
    command: commandQuery[command],
    description: descriptions[command],
  }))
);

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const message =
    'Короче, вводи сюда сообщения следующего формата: \n' +
    '<i>[сумма траты] [причина] [место]</i> \n\n' +
    'например:\n' +
    '14 продукты тц';

  bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

bot.onText(/\/clear/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.chat.username;

  try {
    const rowdata = fs.readFileSync(FULL_PATH, 'utf8');
    const parsed = rowdata ? JSON.parse(rowdata) : {};

    Object.keys(parsed).forEach((msgId) => {
      if (parsed[msgId].userName === userName) {
        parsed[msgId].isActive = false;
      }
    });
    fs.writeFileSync(FULL_PATH, JSON.stringify(parsed));

    bot.sendMessage(chatId, `Очистили записи`);
  } catch (err) {
    bot.sendMessage(chatId, `Неудалось очистить: ${err}`);
  }
});

bot.onText(/\/list/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.chat.username;

  if (checkIsGroup(msg)) {
    return;
  }

  try {
    const rowdata = fs.readFileSync(FULL_PATH, 'utf8');
    const parsed = rowdata ? JSON.parse(rowdata) : {};

    let debtByDay = {};

    Object.values(parsed)
      .filter(
        ({ userName: savedUserName, isActive }) =>
          savedUserName === userName && isActive
      )
      .sort((a, b) => b.date - a.date)
      .forEach((entity) => {
        const { amount, place, reason, date } = entity || {};

        const formattedDate = new Date(date * 1000);
        const key = format(formattedDate, 'd.M.yyyy', { locale: ruLocale });
        const time = format(formattedDate, 'HH:mm', { locale: ruLocale });

        let text = '';
        text += `${amount}`;
        if (reason) text += `, купил: ${reason}`;
        if (place) text += `, место покупки: ${place}`;

        debtByDay[key] = [...(debtByDay[key] || []), { time, text, amount }];
        return text;
      });

    let totals = {};
    Object.keys(debtByDay).forEach((key) => {
      let sum = debtByDay[key].reduce((acc, curr) => {
        acc += curr.amount;
        return acc;
      }, 0);
      totals[key] = sum;
    });

    const total = Object.keys(totals).reduce((acc, curr) => {
      return (acc += totals[curr]);
    }, 0);
    let message = `<b>Общая сумма:</b> ${total}\n`;
    Object.keys(debtByDay).forEach((key) => {
      message += `\n<b>${key}: ${totals[key]}</b> \n \n`;
      debtByDay[key].forEach(({ time, text }) => {
        message += `${time}: ${text}\n`;
      });
    });

    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (err) {
    bot.sendMessage(chatId, `Ничего не нашлось: ${err}`);
  }
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.onText(/^(\d+)/gm, (msg) => {
  const chatId = msg.chat.id;
  const msgId = msg.message_id;
  const text = msg.text.split(' ');
  const msgDate = msg.date;
  const userName = msg.chat.username;

  const amount = Number(text[0].replace(',', '.'));
  const reason = text[1];
  const place = text.slice(2, text.length).join(' ');

  if (amount) {
    fs.open(FULL_PATH, 'a+', (err) => {
      if (err) throw err;

      try {
        const rowdata = fs.readFileSync(FULL_PATH, 'utf8');
        const prevData = rowdata ? JSON.parse(rowdata) : {};
        const updatedData = {
          ...prevData,
          [msgId]: {
            reason,
            place,
            amount,
            date: msgDate,
            userName,
            isActive: true,
          },
        };
        fs.writeFileSync(FULL_PATH, JSON.stringify(updatedData));
      } catch (err) {
        throw err;
      } finally {
        bot.sendMessage(chatId, `*сохранил*`, { parse_mode: 'MarkdownV2' });

        let msg = `@${userName} добавил чек на сумму ${amount}`;
        if (reason) msg += ` на ${reason}`;
        sendToMain(msg);
      }
    });
  }
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
