const Driver = require('../models/driver');
const Supply = require('../models/supply');
const SupplyModifier = require('../models/supply-modifier');
const Coin = require('../models/coin');
const { promisesMap } = require('../util');

/**
 * Bixbcoin driver. Supports total supply
 * and balance for native BIXB coin
 * on own blockchain.
 *
 * @augments Driver
 * @memberof Driver
 */
class Bixbcoin extends Driver {
  constructor(options) {
    super({
      timeout: 100, // 10 request per second
      supports: {
        total: true,
        balances: true,
      },
      options,
    });
  }

  /**
   * @augments Driver.fetchTotalSupply
   * @async
   */
  async fetchTotalSupply() {
    const total = await this.request('https://bixbexplorer.com/ext/getmoneysupply');

    return Number(total);
  }

  /**
   * get balance for specific wallet address
   *
   * @augments Driver.fetchBalance
   * @param {SupplyModifier} modifier {@link SupplyModifier}
   * @async
   */
  async fetchBalance(modifier) {
    const { balance } = await this.request(`https://bixbexplorer.com/ext/getaddress/${modifier}`);
    return Number(balance);
  }

  /**
   * @augments Driver.getSupply
   * @param {Coin} coin {@link Coin}
   * @async
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

module.exports = Bixbcoin;
