const fetch = require('node-fetch');
const CurrencyEnum = require('../enums').CurrencyEnum;

const Currency = {
  [CurrencyEnum.GEL]: CurrencyEnum.GEL,
  [CurrencyEnum.USD]: CurrencyEnum.USD,
  [CurrencyEnum.RUB]: CurrencyEnum.RUB,
  [CurrencyEnum.EUR]: CurrencyEnum.EUR,
};

const API_URL = 'https://api6.unistream.com/api/v1/transfer/calculate';
const RUSSIAN_ID = 361934;
const CASH_AMOUNT = 1000;

const fetchExchangeRate = async (params) => {
  const inCurrency = Currency[params.in];
  const outCurrency = Currency[params.out];
  const form = new URLSearchParams();
  form.append('senderBankId', `${RUSSIAN_ID}`);
  form.append('acceptedCurrency', inCurrency);
  form.append('withdrawCurrency', outCurrency);
  form.append('amount', CASH_AMOUNT);
  form.append('countryCode', 'GEO');

  const request = {
    method: 'POST',
    headers: {
      accept: '*/*',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: form,
  };

  const response = await fetch(API_URL, request);

  if (!response.ok) {
    return response?.text ? await response.text() : response;
  }
  const json = await response.json();
  const rate = (json.fees[0].acceptedAmount / CASH_AMOUNT).toFixed(5);
  return rate;
};

module.exports = { fetchExchangeRate };
