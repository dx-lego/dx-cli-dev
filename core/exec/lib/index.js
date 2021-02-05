'use strict';

// const cp = require('child_process')
const path = require('path')
const Package = require('@dx-cli-dev/package')
const logger = require('@dx-cli-dev/log')
const utils = require('@dx-cli-dev/utils')

const SETTINGS = {
  init: 'axios'
}

const CACHE_DIR = 'dependencies'

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH
  const homePath = process.env.CLI_HOME_PATH
  let storeDir = ''
  let pkg

  const cmdObj = arguments[arguments.length - 1]
  const cmdName = cmdObj.name()
  const packageName = SETTINGS[cmdName]
  const packageVersion = 'latest'

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR)
    storeDir = path.resolve(targetPath, 'node_modules')
    console.log('未传入targetPath，使用默认缓存方案')
    console.log('targetPath: ' + targetPath)
    console.log('storeDir: ' + storeDir)

    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion
    })

    if (await pkg.exists()) {
      console.log('pkg存在，更新package')
      await pkg.update()
    } else {
      console.log('pkg不存在，安装package')
      await pkg.install()
    }

  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    })
  }

  const rootFile = pkg.getRootFile()
  console.log('rootFile: ' + rootFile)
  if (rootFile) {
    try {
      const args = Array.from(arguments)
      const cmd = args[args.length - 1]
      const o = Object.create(null)
      Object.keys(cmd).forEach(key => {
        if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
          o[key] = cmd[key]
        }
      })
      args[args.length - 1] = o

      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`
      const childProcess = utils.exec('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit'
      })
      childProcess.on('error', e => {
        logger.error(e.message)
        process.exit(1)
      })
      childProcess.on('exit', e => {
        logger.verbose('command execute success with code: ' + e)
        process.exit(e)
      })

      // require(rootFile).call(null, Array.from(arguments))
    } catch (e) {
      logger.error(e)
    }
  }
}

// function spawn (command, args, options) {
//   const win32 = process.platform === 'win32'
//   const cmd = win32 ? 'cmd' : command
//   const cmdArgs = win32 ? ['/c'].concat(command, args) : args
//
//   return cp.spawn(cmd, cmdArgs, options || {})
// }

module.exports = exec