const Driver = require('../models/driver');
const Supply = require('../models/supply');
const Coin = require('../models/coin');
const SupplyModifier = require('../models/supply-modifier');
const { promisesMap } = require('../util');

/**
 * SmartHoldem explorer. Supports total supply
 * and balance for STH coin, on own
 * blockchain SmartHoldem.
 *
 * @augments Driver
 * @memberof Driver
 */
class SmartHoldem extends Driver {
  constructor(options) {
    super({
      timeout: 1000, // 1 requests per second
      supports: {
        native: true,
        balances: true,
        blockchains: ['SmartHoldem'],
      },
      options,
    });
  }

  /**
   * get total supply for native token
   *
   * @augments Driver.fetchTotalSupply
   * @async
   */
  async fetchTotalSupply() {
    const { supply } = await this.request(
      'https://node0.smartholdem.io/api/blocks/getSupply',
    );

    return Number(supply) / 10 ** 8;
  }

  /**
   * get balance for specific wallet address
   *
   * @augments Driver.fetchBalance
   * @param {SupplyModifier} modifier {@link SupplyModifier}
   * @async
   */
  async fetchBalance(modifier) {
    const { balance } = await this.request(
      `https://node0.smartholdem.io/api/accounts/getBalance?address=${modifier}`,
    );

    return Number(balance) / 10 ** 8;
  }

  /**
   * @augments Driver.getSupply
   * @param {Coin} coin {@link Coin}
   */
  async getSupply({ modifiers }) {
    const total = await this.fetchTotalSupply();

    const modifiersWithBalances = await promisesMap(
      modifiers,
      async (modifier) => {
        const balance = await this.fetchBalance(modifier);
        return {
          reference: modifier,
          balance,
        };
      },
    );

    const circulating = modifiersWithBalances.reduce(
      (current, modifier) => current - modifier.balance,
      total,
    );

    return new Supply({
      total,
      circulating,
      modifiers: modifiersWithBalances,
    });
  }
}

module.exports = SmartHoldem;
