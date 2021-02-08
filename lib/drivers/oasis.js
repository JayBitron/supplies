const Driver = require('../models/driver');
const Supply = require('../models/supply');

/**
 * Oasis driver. Supports circulating supply
 * for DIA token on Ethereum blockchain.
 *
 * @memberof Driver
 * @augments Driver
 */
class Oasis extends Driver {
  constructor(options) {
    super({
      timeout: 100, // 10 requests per second
      supports: {
        circulating: true,
        total: false,
        blockchains: ['Dai'],
      },
      options,
    });
  }

  /** fetch circulating supply for native token
   *
   * @augments Driver.fetchCirculatingSupply
   * @async
   */
  async fetchCirculatingSupply() {
    const { data: circulating } = await this.request(
      'https://api.oasis.app/v1/supply/dai',
    );

    return Number(circulating) / 10 ** 8;
  }

  /**
   * @augments Driver.getSupply
   * @async
   */
  async getSupply() {
    const circulating = await this.fetchCirculatingSupply();

    return new Supply({
      circulating,
    });
  }
}

module.exports = Oasis;
