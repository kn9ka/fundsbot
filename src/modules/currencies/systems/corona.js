const CurrencyEnum = require('../enums').CurrencyEnum;

const API_URL = 'https://koronapay.com/transfers/online/api/transfers/tariffs';
const Currency = {
  [CurrencyEnum.GEL]: 981,
  [CurrencyEnum.USD]: 840,
  [CurrencyEnum.RUB]: 810,
  [CurrencyEnum.EUR]: 978,
};
const CASH_AMOUNT = 100000;

const fetchExchangeRate = async (params) => {
  const inCurrency = Currency[params.in];
  const outCurrency = Currency[params.out];

  const searchParams = new URLSearchParams();
  searchParams.append('sendingCountryId', 'RUS');
  searchParams.append('sendingCurrencyId', inCurrency);
  searchParams.append('receivingCountryId', 'GEO');
  searchParams.append('receivingCurrencyId', outCurrency);
  searchParams.append('paymentMethod', 'debitCard');
  searchParams.append('receivingAmount', CASH_AMOUNT);
  searchParams.append('receivingMethod', 'cash');
  searchParams.append('paidNotificationEnabled', 'true');

  const request = {
    headers: {
      accept: 'application/vnd.cft-data.v2.99+json',
      'accept-language': 'en',
      'sec-ch-ua':
        '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-application': 'Qpay-Web/3.0',
    },
    referrer: 'https://koronapay.com/transfers/online/',
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: null,
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    body: null,
    method: 'GET',
    mode: 'cors',
  };

  const response = await fetch(
    `${API_URL}?${searchParams.toString()}}`,
    request
  );

  if (!response.ok) {
    return response?.text ? await response.text() : response;
  }
  const json = await response.json();
  const rate = json[0].exchangeRate.toFixed(5);
  return rate;
};

module.exports = { fetchExchangeRate };
