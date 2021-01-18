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
const commander =require('commander')
const init = require('@dx-cli-dev/init')
const exec = require('@dx-cli-dev/exec')

let TEST_MODEL = false
let LOCAL_DEBUG = true

const program = new commander.Command()

async function core(argv) {
  try {
    await prepare()
    registerCommand()

  } catch (e) {
    logger.error(e.message)
  }
}


async function prepare () {
  let version = checkPkgVersion()
  // let nodeVersion = checkNodeVersion()
  let uid = checkRoot()
  let userHome = checkUserHome()
  let env = checkEnv()
  await checkGlobalUpdate()
}

function checkPkgVersion () {
  return pkg.version
}

// function checkNodeVersion () {
//   let currentVersion = process.version
//   let lowestVersion = constant.LOWEST_NODE_VERSION
//
//   if (!semver.gte(currentVersion, lowestVersion)) {
//     throw new Error(colors.red(`dx-cli需要安装v${lowestVersion}以上版本的node.js`))
//   } else {
//     return currentVersion
//   }
// }

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
  if (LOCAL_DEBUG) {
    return
  }

  let currentVersion = pkg.version
  const npmName = pkg.name

  logger.info('update', '检查更新...')
  const {getNpmSemverVersions} = require('@dx-cli-dev/get-npm-info')
  const latestVersion = await getNpmSemverVersions(currentVersion, npmName)
  if (latestVersion && semver.gt(latestVersion, currentVersion)) {
    logger.warn(colors.yellow(`请手动更新${npmName}，当前版本${currentVersion}，最新版本${latestVersion}，更新命令：npm i -g ${npmName}`))
  } else {
    logger.info('update', `当前已经为最新版本${latestVersion}`)
  }
}

function registerCommand () {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', 'debug mode or not', false)
    .option('-t, --test', 'test mode or not', false)
    .option('-tp, --targetPath <targetPath>', 'whether assign the local debug file path', '')

  program
    .command('init [projectName]')
    .option('-f, --force', 'force init the project')
    .action(exec)

  program.on('option:debug', () => {
    if (program.debug) {
      process.env.LOG_LEVEL = 'verbose'
    } else {
      process.env.LOG_LEVEL = 'info'
    }

    logger.level = process.env.LOG_LEVEL
  })

  program.on('option:test', () => {
    test()
  })

  program.on('option:targetPath', () => {
    process.env.CLI_TARGET_PATH = program.targetPath
  })

  program.on('command:*', obj => {
    const availableCommands = program.commands.map(cmd => cmd.name())
    console.log(colors.red('unknown command: ' + obj[0]))
    console.log(colors.green('available command: ' + availableCommands.join(', ')))
  })

  program.parse()

  if (program.args && program.args.length < 1) {
    program.outputHelp()
  }
}

// ******************* Test ********************//
function test() {
  console.log('===================== test output ======================')
}
