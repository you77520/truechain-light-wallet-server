'use strict';
const Subscription = require('egg').Subscription;
const Web3 = require('web3');
const async = require('async');
const {
  iterface,
} = require('../utils');
class UpdateCache extends Subscription {
  static get schedule() {
    return {
      type: 'all',
      interval: '2m',
      // interval: '10s',
    };
  }
  async subscribe() {
    const { mysql } = this.app;
    const data = await mysql.query('SELECT address FROM team WHERE is_eligibility = 1');
    console.log('投票数据开始获取');

    async.mapLimit(data, 2, (item, callback) => {
      const { url, address } = this.app.config.vote;
      const web3 = new Web3(new Web3.providers.HttpProvider(url));
      const contract = new web3.eth.Contract(iterface);
      contract.options.address = address;
      contract.methods.totalVotes(item.address).call().then(res => {
        const number = web3.utils.fromWei(`${res}`, 'ether');
        callback(null, [ item.address, number ]);
      });
    }, async (err, result) => {
      if (err) throw err;
      // console.log('投票数据以获取');
      for (let i = 0; i < result.length; i++) {
        const item = result[i];
        const sql = `UPDATE team set tickets=${item[1]} WHERE address='${item[0]}'`;
        await mysql.query(sql);
      }
    });
  }
  // async myTotalVotes(to) {
  //   const { url, address }   = this.app.config.vote;
  //   const web3               = new Web3(new Web3.providers.HttpProvider(url));
  //   const contract           = new web3.eth.Contract(iterface);
  //   contract.options.address = address;
  //   return contract.methods.totalVotes(to).call();
  // }
}

module.exports = UpdateCache;
