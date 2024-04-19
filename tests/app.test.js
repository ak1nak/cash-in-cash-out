const { calculateCashInFee, calculateCashOutNatural, calculateCashOutJuridical } = require('../src/app');

describe('Commission Fee Calculation', () => {
  describe('Cash In Fees', () => {
    const cashInConfig = {
      percents: 0.03,
      max: { amount: 5.00 },
    };

    it('calculates the correct cash in fee', () => {
      expect(calculateCashInFee(10000, cashInConfig)).toEqual(3.00);
      expect(calculateCashInFee(1000000, cashInConfig)).toEqual(5.00);
    });
  });

  describe('Cash Out Fees for Natural Persons', () => {
    const cashOutNaturalConfig = {
      percents: 0.3,
      weekLimit: { amount: 1000.00 },
    };
    let transactions = {};

    it('applies no fee for weekly limit not exceeded', () => {
      const result = calculateCashOutNatural(500, cashOutNaturalConfig, transactions, 1, '2020-01-01');
      expect(result.fee).toEqual(0.00);
    });

    it('calculates the correct fee after exceeding the weekly limit', () => {
      transactions = { 1: { 1: 1000.00 } };
      const result = calculateCashOutNatural(500, cashOutNaturalConfig, transactions, 1, '2020-01-01');
      expect(result.fee).toEqual(1.50);
    });
  });

  describe('Cash Out Fees for Juridical Persons', () => {
    const cashOutJuridicalConfig = {
      percents: 0.3,
      min: { amount: 0.50 },
    };

    it('calculates the correct minimum fee', () => {
      expect(calculateCashOutJuridical(100, cashOutJuridicalConfig)).toEqual(0.50);
    });

    it('calculates the correct fee above the minimum', () => {
      expect(calculateCashOutJuridical(1000, cashOutJuridicalConfig)).toEqual(3.00);
    });
  });
});
