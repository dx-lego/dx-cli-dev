'use strict';

module.exports = core

const path = require('path')
const pkg = require('../package.json')
const logger = require('@dx-cli-dev/log')
const constant = require('./constant')
const semver = require('semver')
const colors = require('colors/safe')
const userHome = require('user-home')
const pathExists = require('path-exists').sync

let TEST_MODEL = false

async function core(argv) {
  try {
    let args = checkArgs(argv)

    if (TEST_MODEL) {
      test()
      return
    }

    let version = checkVersion()
    let nodeVersion = checkNodeVersion()
    let uid = checkRoot()
    let userHome = checkUserHome()
    let env = checkEnv()
    await checkGlobalUpdate()

  } catch (e) {
    logger.error(e.message)
  }
}

function checkVersion () {
  return pkg.version
}

function checkNodeVersion () {
  let currentVersion = process.version
  let lowestVersion = constant.LOWEST_NODE_VERSION

  if (!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(colors.red(`dx-cli需要安装v${lowestVersion}以上版本的node.js`))
  } else {
    return currentVersion
  }
}

function checkRoot () {
  const rootCheck = require('root-check')
  rootCheck()

  return process.getuid()
}

function checkUserHome () {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('用户主目录不存在'))
  } else {
    return userHome
  }
}

function getInputArgs (argv) {
  const minimist = require('minimist')
  const args = minimist(argv)
  return args
}

function checkArgs(argv) {
  let args = getInputArgs(argv)
  if (args.debug || args.test) {
    process.env.LOG_LEVEL = 'verbose'
  } else {
    process.env.LOG_LEVEL = 'info'
  }

  logger.level = process.env.LOG_LEVEL

  if (args.test) {
    TEST_MODEL = true
  }

  return args
}

function checkEnv () {
  let dotEnv = require('dotenv')
  let dotEnvPath = path.resolve(userHome, '.env')
  if (pathExists(dotEnvPath)) {
    dotEnv.config({
      path: dotEnvPath
    })
  }

  // process.env中此时也包含了.env文件中配置的环境变量
  createDefaultConfig()

  return {
    cliHomePath: process.env.CLI_HOME_PATH,
    cliHome: process.env.CLI_HOME,
    dbUser: process.env.DB_USER,
    dbPwd: process.env.DB_PASSWORD
  }
}

function createDefaultConfig () {
  const cliConfig = {
    home: userHome
  }

  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME)
  }

  process.env.CLI_HOME_PATH = cliConfig.cliHome
  return cliConfig
}

async function checkGlobalUpdate () {
  let currentVersion = pkg.version
  const npmName = pkg.name

  const {getNpmSemverVersions} = require('@dx-cli-dev/get-npm-info')
  const latestVersion = await getNpmSemverVersions(currentVersion, npmName)
  if (latestVersion && semver.gt(latestVersion, currentVersion)) {
    logger.warn(colors.yellow(`请手动更新${npmName}，当前版本${currentVersion}，最新版本${latestVersion}，更新命令：npm i -g ${npmName}`))
  } else {
    logger.verbose(`当前为最新版本${latestVersion}`)
  }
}

// ******************* Test ********************//
function test() {
  let arr = [3, 5, 6, 1, 7]
  arr.sort(function (a, b) {
    return b - a
  })
  console.log(arr)
}