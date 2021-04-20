const axiosInstance = require('../utils/request');
const { timestamp } = require('../utils/index');
const randomHeader = require('../utils/randomHeader');

const defaltHeaders = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'max-age=0',
  Connection: 'keep-alive',
  Host: 'stock.xueqiu.com',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': 1,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36};',
};
class Xueqiu {
  cookies = `device_id=${Math.random().toString(36).substring(2, 15)}`;
  constructor() {
    this.init();
  }

  get headers() {
    return {
      ...defaltHeaders,
      ...randomHeader(),
      Cookie: this.cookies,
    };
  }

  init() {
    axiosInstance.get(`https://xueqiu.com/`).then((response) => {
      const cookiesHeader = response.headers['set-cookie'];
      this.cookies +=
        cookiesHeader
          .map((h) => {
            let content = h.split(';')[0];
            return content.endsWith('=') ? '' : content;
          })
          .filter((h) => h != '')
          .join(';') + ';';
    });
  }

  request(url, withHeaders = true) {
    return axiosInstance
      .get(
        url,
        withHeaders
          ? {
              headers: this.headers,
            }
          : {},
      )
      .then((response) => {
        // 处理cookie 问题
        if (response.status === 400) {
          this.init();
        }
        return response.data;
      })
      .catch((err) => {
        this.init();
        console.log(err);
      });
  }
  quote(symbol) {
    // `https://stock.xueqiu.com/v5/stock/quote.json?symbol=${symbol}&extend=detail`;
    const url = `https://stock.xueqiu.com/v5/stock/batch/quote.json?symbol=${symbol}&_=${timestamp()}`;
    return this.request(url);
  }
  batchQuoteResp(items = []) {
    return items
      .map(({ market, quote }) => {
        const { status } = market;
        const {
          open,
          last_close,
          high,
          current,
          name,
          percent,
          turnover_rate,
          amplitude,
          amount,
          volume,
          symbol,
        } = quote;
        return [
          `${percent >= 0 ? '🍖' : '🌱'} ${name}  ( ${status} )`,
          `涨幅 : ${percent}%\n现价 : ${current}`,

          `今开 : ${open}\n今日最高 : ${high} \n昨收 : ${last_close}`,
          turnover_rate
            ? `换手 : ${turnover_rate}% \n振幅 : ${amplitude}% `
            : `振幅 : ${amplitude}% `,
          `成交量 : ${(volume / 1000000).toFixed(2)}万手\n成交额 : ${(
            amount / 100000000
          ).toFixed(2)}亿`,
          `https://xueqiu.com/S/${symbol}`,
        ].join('\n');
      })
      .join('\n\n');
  }
  list(page, size) {
    const url = `https://xueqiu.com/service/v5/stock/screener/quote/list?page=${page}&size=${size}&order=desc&orderby=percent&order_by=percent&market=CN&type=sh_sz&_=${timestamp()}`;
    return this.request(url, false).then((res) => res.data);
  }
  longhu(date) {
    const url = `https://xueqiu.com/service/v5/stock/hq/longhu?date=${date}&_=${timestamp()}`;
    return this.request(url, false);
  }
  longhuRes({ items, items_size }, date) {
    if (items_size === 0) {
      return '暂无当日龙虎榜数据！';
    }
    return items
      .map((item) => {
        const { symbol, name, percent, type_name } = item;
        return [
          `${percent >= 0 ? '🔴' : '🟢'} ${name}  涨幅 : ${percent}%`,
          `上榜原因 : ${type_name.join('\n')} `,
          `https://xueqiu.com/snowman/S/${symbol}/detail#/LHB?date=${date}`,
        ].join('\n');
      })
      .join('\n');
  }
}

module.exports = new Xueqiu();
