const format = require('date-fns/format');
const ruLocale = require('date-fns/locale/ru');

const createDebtsMsgByUser = (rows, options = { withUserName: false }) => {
  let debtByDay = {};
  let totals = {};

  rows
    .filter(([, , , , , isActive]) => Boolean(isActive))
    .forEach((row) => {
      const [msgId, amount, reason, place, date, userName, isActive] = row;

      const formattedDate = new Date(date * 1000);
      const key = format(formattedDate, 'd.M.yyyy', { locale: ruLocale });
      const time = format(formattedDate, 'HH:mm', { locale: ruLocale });

      let text = '';
      text += `${amount}`;
      if (reason) text += `, купил: ${reason}`;
      if (place) text += `, место покупки: ${place}`;
      if (options?.withUserName) text += ` (@${userName})`;

      debtByDay[key] = [
        ...(debtByDay[key] || []),
        { time, text, amount: +amount },
      ];
    });

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

  return message;
};
module.exports = {
  createDebtsMsgByUser,
};
