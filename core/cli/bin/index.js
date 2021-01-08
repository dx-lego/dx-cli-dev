#! /usr/bin/env node

console.log('hello dx-cli-dev!!!')

const importLocal = require('import-local')

if (importLocal(__filename)) {
  require('npmlog').info('cli', '正在使用dx-cli本地版本')
} else {
  require('../lib')(process.argv.slice(2))
}

// const utils = require('@dx-cli-dev/utils')
//
// utils()