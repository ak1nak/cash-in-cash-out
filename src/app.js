import axios from 'axios';
import fs from 'fs';

async function fetchConfig(url) {
  try {
    const response = await axios.get(url);
    if (!response.data || response.data.length === 0) {
      console.error('Configuration data is empty');
      return null;
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching config:', error);
    return null;
  }
}

function calculateCashInFee(amount, config) {
  if (!config || config.percents === undefined || !config.max || config.max.amount === undefined) {
    console.error('Invalid or incomplete configuration for cash in.');
    return 0;
  }

  let fee = (amount * config.percents) / 100;
  fee = fee > config.max.amount ? config.max.amount : fee;
  return Math.ceil(fee * 100) / 100;
}

function getWeekOfYear(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear + (
    (firstDayOfYear.getDay() + 6) % 7) * 86400000) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay()) / 7);
}

function calculateCashOutNatural(amount, config, transactions, userId, date) {
  const currentWeek = getWeekOfYear(new Date(date));
  const userTransactions = transactions[userId] || {};
  const userWeekTransactions = userTransactions[currentWeek] || 0;

  let fee = 0;
  const totalWeekAmount = userWeekTransactions + amount;

  if (totalWeekAmount <= config.week_limit.amount) {
    fee = 0;
  } else {
    const taxableAmount = totalWeekAmount > config.week_limit.amount
                          && userWeekTransactions < config.week_limit.amount
      ? totalWeekAmount - config.week_limit.amount
      : amount;

    fee = (taxableAmount * config.percents) / 100;
  }

  const newTransactions = {
    ...transactions,
    [userId]: {
      ...userTransactions,
      [currentWeek]: totalWeekAmount,
    },
  };

  return {
    fee: Math.ceil(fee * 100) / 100,
    transactions: newTransactions,
  };
}

function calculateCashOutJuridical(amount, config) {
  const { percents, min } = config;
  let fee = (amount * percents) / 100;
  fee = fee < min.amount ? min.amount : fee;
  return Math.ceil(fee * 100) / 100;
}

async function main(inputFilePath) {
  const rawData = fs.readFileSync(inputFilePath);
  const operations = JSON.parse(rawData);
  let transactions = {};

  const cashInConfig = await fetchConfig('https://developers.paysera.com/tasks/api/cash-in');
  const cashOutNaturalConfig = await fetchConfig('https://developers.paysera.com/tasks/api/cash-out-natural');
  const cashOutJuridicalConfig = await fetchConfig('https://developers.paysera.com/tasks/api/cash-out-juridical');

  operations.forEach((operation) => {
    let fee = 0;
    switch (operation.type) {
      case 'cash_in':
        fee = calculateCashInFee(operation.operation.amount, cashInConfig);
        break;
      case 'cash_out':
        if (operation.user_type === 'natural') {
          const result = calculateCashOutNatural(
            operation.operation.amount,
            cashOutNaturalConfig,
            transactions,
            operation.user_id,
            operation.date,
          );
          fee = result.fee;
          transactions = result.transactions;
        } else if (operation.user_type === 'juridical') {
          fee = calculateCashOutJuridical(operation.operation.amount, cashOutJuridicalConfig);
        }
        break;
      default:
        console.log('Unsupported operation type');
    }
    console.log(`${fee.toFixed(2)}`);
  });
}

const inputFilePath = process.argv[2];
main(inputFilePath).catch((err) => console.error('Error running the application:', err));

export {
  fetchConfig,
  calculateCashInFee,
  calculateCashOutNatural,
  calculateCashOutJuridical,
};
