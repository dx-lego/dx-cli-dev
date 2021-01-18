'use strict';

const semver = require('semver')
const colors = require('colors')
const logger = require('@dx-cli-dev/log')
const utils = require('@dx-cli-dev/utils')
const LOWEST_NODE_VERSION = '12.0.0'

class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error('command args can not be empty')
    }
    if (!Array.isArray(argv)) {
      throw new Error('command args must be array')
    }
    if (argv.length < 1) {
      throw new Error('command args must be array and not empty')
    }

    this._argv = argv
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain = chain.then(() => this.checkNodeVersion())
      chain = chain.then(() => this.initArgs())
      chain = chain.then(() => this.init())
      chain = chain.then(() => this.exec())
      chain.catch(err => {
        logger.error(err.message)
      })
    })
  }

  checkNodeVersion () {
    let currentVersion = process.version
    let lowestVersion = LOWEST_NODE_VERSION

    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(colors.red(`dx-cli need install node.js version is greater than v${lowestVersion}`))
    } else {
      logger.verbose('node version', currentVersion)
      return currentVersion
    }
  }

  initArgs () {
    this._cmd = this._argv[this._argv.length - 1]
    this._argv = this._argv.slice(0, this._argv.length - 1)
  }

  init () {
    throw new Error('must implement init method')
  }

  exec () {
    throw new Error('must implement exec method')
  }
}

module.exports = Command