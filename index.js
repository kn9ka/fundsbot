const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const EXPENSES_DIR = './expenses';
const EXPENSES_FILENAME = 'expenses.json';
const FULL_PATH = path.resolve(EXPENSES_DIR, EXPENSES_FILENAME);

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

  try {
    const rowdata = fs.readFileSync(FULL_PATH, 'utf8');
    const parsed = rowdata ? JSON.parse(rowdata) : {};
    let sum = 0;

    const rows = Object.keys(parsed)
      .filter(
        (msgId) => parsed[msgId].userName === userName && parsed[msgId].isActive
      )
      .map((msgId) => {
        const entity = parsed[msgId];
        const { amount, place, reason, date } = entity || {};
        sum += amount;

        let text = `потратил: ${amount}`;
        if (reason) text += `, на: ${reason}`;
        if (place) text += `, в: ${place}`;
        if (date) {
          let formattedDate = new Date(date * 1000).toLocaleDateString();
          text += `, когда: ${formattedDate}`;
        }
        return text;
      });

    const message = `
      *Общая сумма:* ${sum}\n\n${rows.join('\n')}
    `;
    bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
  } catch (err) {
    bot.sendMessage(chatId, `Ничего не нашлось: ${err}`);
  }
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
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
      }
    });
  } else {
    // bot.sendMessage(chatId, 'получил сообщение, но не знаю что ним делать')
  }
});
