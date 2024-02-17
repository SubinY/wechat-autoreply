const axiosInstance = require("../utils/request");
const { timestamp } = require("../utils/index");
const randomHeader = require("../utils/randomHeader");
const { defaultHeaders } = require("../constants");

class Xueqiu {
  cookies = `device_id=${Math.random().toString(36).substring(2, 15)}`;
  constructor() {
    this.init();
  }

  get headers() {
    return {
      ...defaultHeaders,
      ...randomHeader(),
      Cookie: this.cookies,
    };
  }

  init() {
    axiosInstance.get(`https://xueqiu.com/`).then((response) => {
      const cookiesHeader = response.headers["set-cookie"];
      this.cookies +=
        cookiesHeader
          .map((h) => {
            let content = h.split(";")[0];
            return content.endsWith("=") ? "" : content;
          })
          .filter((h) => h != "")
          .join(";") + ";";
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
          : {}
      )
      .then((response) => {
        // 处理cookie 问题
        if (response?.status === 400 || !response?.status) {
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
  batchQuoteResp(items = [], type = 0) {
    return items
      .map(({ market = {}, quote }) => {
        const { status } = market || {};
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
        const red = percent >= 0;
        if (type === 0) {
          return [`${symbol.substr(2)}：${red ? "+" : ""}${percent}%`].join(
            "，"
          );
        }
        if (type === 1) {
          return [
            `${red ? "🍖" : "🌱"} ${name}：现价 ${current}`,
            `${red > 0 ? "涨" : "跌"}幅 ${percent}%`,
            // `振幅 ${amplitude}%`,
          ].join("，");
        }
        return [
          `${red ? "🍖" : "🌱"} ${name}  ( ${status} )`,
          `${red > 0 ? "涨" : "跌"}幅 : ${percent}%\n现价 : ${current}`,

          `今开 : ${open}\n今日最高 : ${high} \n昨收 : ${last_close}`,
          turnover_rate
            ? `换手 : ${turnover_rate}% \n振幅 : ${amplitude}% `
            : `振幅 : ${amplitude}% `,
          `成交量 : ${(volume / 1000000).toFixed(2)}万手\n成交额 : ${(
            amount / 100000000
          ).toFixed(2)}亿`,
          `https://xueqiu.com/S/${symbol}`,
        ].join("\n");
      })
      .join("\n\n");
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
      return "暂无当日龙虎榜数据！";
    }
    return items
      .map((item) => {
        const { symbol, name, percent, type_name } = item;
        return [
          `${percent >= 0 ? "🔴" : "🟢"} ${name}  涨幅 : ${percent}%`,
          `上榜原因 : ${type_name.join("\n")} `,
          `https://xueqiu.com/snowman/S/${symbol}/detail#/LHB?date=${date}`,
        ].join("\n");
      })
      .join("\n");
  }
}

module.exports = new Xueqiu();
