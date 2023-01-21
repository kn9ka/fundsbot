const unistream = require('./systems/unistream');
const corona = require('./systems/corona');
const CurrencyEnum = require('./enums').CurrencyEnum;

const fetchExchangeRates = async () => {
  return {
    [CurrencyEnum.USD]: {
      unistream: await unistream.fetchExchangeRate({
        in: CurrencyEnum.RUB,
        out: CurrencyEnum.USD,
      }),
      corona: await corona.fetchExchangeRate({
        in: CurrencyEnum.RUB,
        out: CurrencyEnum.USD,
      }),
    },
    [CurrencyEnum.GEL]: {
      unistream: await unistream.fetchExchangeRate({
        in: CurrencyEnum.RUB,
        out: CurrencyEnum.GEL,
      }),
      corona: await corona.fetchExchangeRate({
        in: CurrencyEnum.RUB,
        out: CurrencyEnum.GEL,
      }),
    },
    [CurrencyEnum.EUR]: {
      unistream: await unistream.fetchExchangeRate({
        in: CurrencyEnum.RUB,
        out: CurrencyEnum.EUR,
      }),
      corona: await corona.fetchExchangeRate({
        in: CurrencyEnum.RUB,
        out: CurrencyEnum.EUR,
      }),
    },
  };
};

module.exports = { fetchExchangeRates };
