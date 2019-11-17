
var BufferHelper = require('bufferhelper');
var iconv = require('iconv-lite');
var { argv } = require('yargs');
const https = require('https');
const fs = require('fs');
const querystring = require('querystring');
const WEEK_LIST = [
  '周天',
  '周一',
  '周二',
  '周三',
  '周四',
  '周五',
  '周六',
];
const HOLIDAY_LIST = [
  "2020-5-1",
  "2020-5-2",
  "2020-5-3",
  "2020-6-25",
  "2020-6-26",
  "2020-6-27",
  "2020-9-30",
  "2020-10-1",
  "2020-10-2",
  "2020-10-3",
  "2020-10-4",
  "2020-10-5",
  "2020-10-6",
  "2020-10-7",
  "2020-10-8",
  "2020-10-9",
];

const _getDefaultYear = () => (new Date()).getFullYear();
const _getDefaultMonth = () => (new Date()).getMonth() + 1;
const _getDefaultMonthList = () => Array.from({ length: 12 }, (_, x) => x + 1);
const _decodeBuffer2GBK = (bufferHelper) => iconv.decode(bufferHelper.toBuffer(), 'GBK');
const _getDefaultFileName = (fileName = _getDefaultYear()) => `tmp/${fileName}.json`;
const _isHoliday = item => HOLIDAY_LIST.includes(item.date);
const _isWeekend = item => item.day === 0 || item.day === 6

function _getApi (year, month) {
  const api = `https://sp0.baidu.com/8aQDcjqpAAV3otqbppnN2DJv/api.php`;
  const queryObj = {
    query: `${year}年${month}月`,
    resource_id: 6018,
    format: 'json',
    ie: 'utf8',
    oe: 'gbk'
  };
  const queryParams = querystring.stringify(queryObj);
  return api + '?' + queryParams;
}

function getAlmanacByMonth (year = _getDefaultYear(), month = _getDefaultMonth()) {
  const url = _getApi(year, month);
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const bufferHelper = new BufferHelper();
      res.on('data', chunk => bufferHelper.concat(chunk))
        .on('end', () => resolve(JSON.parse(_decodeBuffer2GBK(bufferHelper))));
    }).on('error', reject);
  });
}

function getAlmanacByYear (year = _getDefaultYear(), monthList = _getDefaultMonthList()) {
  return Promise.all(monthList.map(month => getAlmanacByMonth(year, month)));
}

function output (fileName = _getDefaultYear()) {
  return (data) => {
    const path = _getDefaultFileName(fileName);
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, JSON.stringify(data, null, 2), { flag: 'as', encoding: 'utf8' });
    }
    return data;
  };
}
function _addWeekProperties (item) {
  const day = (new Date(item.date)).getDay();
  item['week'] = WEEK_LIST[day];
  item['day'] = day;
  return item;
}

function dealResult (data) {
  const bestDays = data.map(getBestDay)
    .reduce((pre, curr) => pre.concat(curr), [])
    .map(_addWeekProperties)
    .filter(item => _isWeekend(item) || _isHoliday(item));
  console.log(bestDays.length);
  for (const day of bestDays) {
    console.log(day.date);
    console.log(day.week);
    console.log('suit:', day.suit);
    console.log('avoid:', day.avoid);
    console.log(`##############################################`);
  }
}

function getBestDay (item) {
  return item.data[0].almanac.filter(it => it.suit.indexOf('嫁娶') > -1);
  // return item.data[0].almanac.filter(it => it.avoid.indexOf('嫁娶') > -1);
}


(function () {
  const { year: YEAR } = argv;
  const path = _getDefaultFileName(YEAR);
  if (!fs.existsSync(path)) {
    getAlmanacByYear(YEAR)
      .then(output(YEAR))
      .then(dealResult)
      .catch(err => console.error(err));
  } else {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    dealResult(data);
  }
})();
