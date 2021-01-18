'use strict';

const Command = require('@dx-cli-dev/command')
const logger = require('@dx-cli-dev/log')
const fs = require('fs')

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = !!this._cmd.force
  }

  exec() {
    try {
      this.prepare()
    } catch (e) {
      logger.error(e.message)
    }
  }

  prepare () {
    if (!this.isCwdEmpty()) {

    }
  }

  isCwdEmpty () {
    const localPath = process.cwd()
    let fileList = fs.readdirSync(localPath)
    fileList = fileList.filter(file =>
      (!file.startsWith('.') && ['node_modules'].indexOf(file) < 0)
    )
    return !fileList || fileList.length <= 0
  }
}

function init(argv) {
  return new InitCommand(argv)
}

module.exports = init
module.exports.InitCommand = InitCommand