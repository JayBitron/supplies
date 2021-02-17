const Driver = require('../models/driver');
const Supply = require('../models/supply');
const { promisesMap } = require('../util');
const SupplyModifier = require('../models/supply-modifier');
const Coin = require('../models/coin');

/**
 * Blockchair driver. Support total supply
 * and balance, on various blockchains: Litecoin,
 * BitcoinCash, BitcoinSV, Monero
 *
 * @memberof Driver
 * @augments Driver
 */
class Blockchair extends Driver {
  constructor(options) {
    super({
      timeout: 200, // 5 requests per second
      options,
      supports: {
        native: false,
        total: true,
        balances: true,
        blockchains: ['Litecoin', 'Bitcoin Cash', 'Bitcoin SV', 'Monero'],
      },
    });
  }

  async totalSupplyMonero() {
    const { data } = await this.request('https://api.blockchair.com/monero/stats');
    return data.circulation / 10 ** 12;
  }

  async totalSupplyBitcoinSV() {
    const { data } = await this.request('https://api.blockchair.com/bitcoin-sv/stats');
    return data.circulation / 10 ** 8;
  }

  async totalSupplyBitcoinCash() {
    const { data } = await this.request(
      'https://api.blockchair.com/bitcoin-cash/stats',
    );
    return data.circulation / 10 ** 8;
  }

  async totalSupplyLitecoin() {
    const { data } = await this.request(
      'https://api.blockchair.com/litecoin/stats',
    );

    return data.circulation / 10 ** 8;
  }

  /**
   * @augments Driver.fetchTotalSupply
   * @async
   * @param {string} blockchain one of supported blockchains
   */
  async fetchTotalSupply(blockchain) {
    const slug = blockchain.replace(' ', '');
    if (this.supportsBlockchain(blockchain) && this[`totalSupply${slug}`]) {
      return this[`totalSupply${slug}`]();
    }

    throw new Error(`The blockchain "${blockchain}" is not supported in this driver`);
  }

  async balanceLitecoin(modifier) {
    const { data } = await this.request(
      `https://api.blockchair.com/litecoin/dashboards/address/${modifier}`,
    );
    return data[modifier].address.balance / 10 ** 8;
  }

  async balanceBitcoinCash(modifier) {
    const { data } = await this.request(
      `https://api.blockchair.com/bitcoin-cash/dashboards/address/${modifier}`,
    );
    return data[modifier].address.balance / 10 ** 8;
  }

  async balanceBitcoinSV(modifier) {
    const { data } = await this.request(`https://api.blockchair.com/bitcoin-sv/dashboards/address/${modifier}`);
    return data[modifier].address.balance / 10 ** 8;
  }

  async balanceMonero() {
    return null;
  }

  /**
   * @augments Driver.fetchBalance
   * @param {SupplyModifier} modifier {@link SupplyModifier}
   * @param {string} blockchain on of supported blockchains
   * @async
   */
  async fetchBalance(modifier, blockchain) {
    const slug = blockchain.replace(' ', '');
    if (this.supportsBlockchain(blockchain) && this[`balance${slug}`]) {
      return this[`balance${slug}`](modifier);
    }

    throw new Error(`The blockchain "${blockchain}" is not supported in this driver`);
  }

  /**
   * @augments Driver.getSupply
   * @param {Coin} coin {@link Coin}
   * @async
   */
  async getSupply({ modifiers, blockchain }) {
    const total = await this.fetchTotalSupply(blockchain);

    const modifiersWithBalances = await promisesMap(
      modifiers,
      async (modifier) => {
        const balance = await this.fetchBalance(modifier, blockchain);

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

module.exports = Blockchair;
