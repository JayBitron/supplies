const Driver = require('../models/driver');
const Supply = require('../models/supply');
const { promisesMap } = require('../util');
const SupplyModifier = require('../models/supply-modifier');
const Coin = require('../models/coin');

/**
 * BuySell driver. Supports total supply
 * and balance for token BCP.
 *
 * @memberof Driver
 * @augments Driver
 */
class BuyCoinPos extends Driver {
  constructor(options) {
    super({
      timeout: 200, // 5 requests per second
      supports: {
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
    const total = await this.request('http://144.91.94.73:3031/ext/getmoneysupply');

    return Number(total);
  }

  /**
   *
   * @augments Driver.fetchBalance
   * @param {SupplyModifier} modifier {@link SupplyModifier}
   * @async
   */
  async fetchBalance(modifier) {
    const { balance } = await this.request(`http://144.91.94.73:3031/ext/getaddress/${modifier}`);

    return Number(balance);
  }

  /**
   * @augments Driver.getSupply
   * @param {Coin} modifiers {@link Coin}
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

    const circulating = modifiersWithBalances
      .reduce((current, modifier) => current - modifier.balance, total);

    return new Supply({
      total,
      circulating,
      modifiers: modifiersWithBalances,
    });
  }
}

module.exports = BuyCoinPos;
