'use strict';

const Command = require('@dx-cli-dev/command')
const logger = require('@dx-cli-dev/log')
const fs = require('fs')
const inquirer = require('inquirer')
const fsExtra = require('fs-extra')
const semver = require('semver')
const getProjectTemplate =require('./getProjectTemplate')
const Package = require('@dx-cli-dev/package')
const path = require('path')
const userHome = require('user-home')
const {spinnerStart, sleep, execAsync} = require('@dx-cli-dev/utils')
const glob = require('glob')
const ejs = require('ejs')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

const TEMPLATE_TYPE_NORMAL = 'normal'
const TEMPLATE_TYPE_CUSTOM = 'custom'

const WHITE_COMMAND = ['npm', 'cnpm']

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = !!this._cmd.force
  }

  async exec() {
    try {
      let ret = await this.prepare()
      if (ret) {
        this.projectInfo = ret
        await this.downloadTemplate()
        await this.installTemplate()
      }
    } catch (e) {
     logger.error(e)
    }
  }

  async installTemplate () {
    console.log(this.templateInfo)
    let self = this

    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL
      }

      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        await normalInstall()
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        await customInstall()
      } else {
        throw new Error('unable to resolve the template type of ' + this.templateInfo.type)
      }

    } else {
      throw new Error('no template info')
    }

    function checkCommand (cmd) {
      if (WHITE_COMMAND.includes(cmd)) {
        return cmd
      } else {
        return null
      }
    }

    async function execCommand (cmdStr) {
      let cmdRet
      if (cmdStr) {
        const cmdArr = cmdStr.split(' ')
        const cmd = checkCommand(cmdArr[0])

        if (!cmd) {
          throw new Error('command not exist or illegal: ' + cmdStr)
        }

        const args = cmdArr.slice(1)
        console.log(cmd, args)

        cmdRet = await execAsync(cmd, args, {
          stdio: 'inherit',
          cwd: process.cwd()
        })
      }

      return cmdRet
    }

    function ejsRender (options) {
      const dir = process.cwd()
      return new Promise((resolve, reject) => {
        glob('**', {
          cwd: dir,
          ignore: options.ignore || '',
          nodir: true,
        }, (err, files) => {
          if (err) {
            reject(err)
          } else {
            Promise.all(files.map(file => {
              const filePath = path.join(dir, file)
              return new Promise((resolve1, reject1) => {
                ejs.renderFile(filePath, self.projectInfo, {}, (err, result) => {
                  if (err) {
                    reject1(err)
                  } else {
                    fsExtra.writeFileSync(filePath, result)
                    resolve1(result)
                  }
                })
              })

            })).then(() => {
              resolve()
            }).catch(err => {
              reject(err)
            })
          }

        })
      })
    }

    async function normalInstall () {
      let spinner = spinnerStart('template installing...')
      await sleep()
      try {
        const templatePath = path.resolve(self.templateNpm.cacheFilePath, 'template')
        const targetPath = process.cwd()
        fsExtra.ensureDirSync(templatePath)
        fsExtra.ensureDirSync(targetPath)
        fsExtra.copySync(templatePath, targetPath)
      } catch (e) {
        throw e
      } finally {
        spinner.stop(true)
        logger.success('template install success')
      }

      const templateInfoIgnore = self.templateInfo.ignore || []
      const ignore = ['node_modules/**', ...templateInfoIgnore]
      await ejsRender({ignore})

      const {installCommand, startCommand} = self.templateInfo
      let installRet = await execCommand(installCommand)
      if (installRet === 0) {
        let startRet = await execCommand(startCommand)
        if (startRet !== 0) {
          throw new Error('project start failed')
        }
      } else {
        throw new Error('project dependencies install failed')
      }
    }

    async function customInstall () {
      if (await self.templateNpm.exists()) {
        const rootFile = self.templateNpm.getRootFile()

        if (fs.existsSync(rootFile)) {
          logger.notice('start invoke custom template')

          const templatePath = path.resolve(self.templateNpm.cacheFilePath, 'template')
          const options = {
            ...self.templateInfo,
            ...self.projectInfo,
            sourcePath: templatePath,
            targetPath: process.cwd()
          }
          const code = `require('${rootFile}')(${JSON.stringify(options)})`
          logger.verbose('code', code)
          await execAsync('node', ['-e', code], {stdio: 'inherit', cwd: process.cwd()})

          logger.success('custom template invoked')
        } else {
          throw new Error('no main file of custom template')
        }
      }
    }
  }

  async downloadTemplate () {
    const templateInfo = this.template.find(item =>
      item.npmName === this.projectInfo.projectTemplate)
    this.templateInfo = templateInfo
    const targetPath = path.resolve(userHome, '.dx-cli-dev', 'template')
    const storeDir = path.resolve(userHome, '.dx-cli-dev', 'template', 'node_modules')
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: templateInfo.npmName,
      packageVersion: templateInfo.version
    })

    if (!await templateNpm.exists()) {
      const spinner = spinnerStart('template downloading...')
      await sleep()
      try {
        await templateNpm.install()
      } catch (e) {
        throw e
      } finally {
        spinner.stop(true)
        if (await templateNpm.exists()) {
          logger.success('template download completed')
          this.templateNpm = templateNpm
        }
      }
    } else {
      const spinner = spinnerStart('template updating...')
      await sleep()
      try {
        await templateNpm.update()
      } catch (e) {
        throw e
      } finally {
        spinner.stop(true)
        if (await templateNpm.exists()) {
          logger.success('template update completed')
          this.templateNpm = templateNpm
        }
      }
    }
  }

  async prepare() {
    const template = await getProjectTemplate()
    if (!template || template.length === 0) {
      throw new Error('No template for init')
    }
    this.template = template

    const localPath = process.cwd()
    let goNext = false
    if (!this.isDirEmpty(localPath)) {
      if (this.force) {
        const answer1 = await this.emptyDirConfirm()
        if (answer1.ifContinue) {
          const answer2 = await this.emptyDirConfirm()
          if (answer2.ifContinue) {
            fsExtra.emptyDirSync(localPath)
            goNext = true
          }
        }
      } else {
        fsExtra.emptyDirSync(localPath)
        goNext = true
      }
    } else {
      goNext = true
    }

    if (goNext) {
      return this.getProjectInfo()
    }
  }

  async getProjectInfo () {
    const answer = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: 'select the init type',
      default: TYPE_PROJECT,
      choices: [
        {
          name: 'project',
          value: TYPE_PROJECT
        },
        {
          name: 'component',
          value: TYPE_COMPONENT
        }
      ]
    })

    const type = answer.type
    this.template = this.template.filter(template => {
      return template.tag.includes(type)
    })

    let createInfo = {}
    createInfo = await this.inquireProjectInfo(type)

    if (createInfo.projectName) {
      createInfo.name = createInfo.projectName
      createInfo.className = require('kebab-case')(createInfo.projectName).replace(/^-/, '')
    }

    if (createInfo.projectVersion) {
      createInfo.version = createInfo.projectVersion
    }

    if (createInfo.componentDescription) {
      createInfo.description = createInfo.componentDescription
    }

    return {
      type,
      ...createInfo
    }
  }

  async inquireProjectInfo (type) {
    let self = this
    let questions = [
      {
        type: 'input',
        name: 'projectName',
        message: 'please input the project name',
        default: this.projectName ? this.projectName : '',
        validate (v) {
          const done = this.async()
          setTimeout(() => {
            if (!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
              done('invalid project name! input again~')
              return
            }

            done(null, true)
          }, 0)
        },
        filter (v) {
          return v
        }
      },
      {
        type: 'input',
        name: 'projectVersion',
        message: 'please input the project version',
        default: '1.0.0',
        validate (v) {
          const done = this.async()
          setTimeout(() => {
            if (!(!!semver.valid(v))) {
              done('invalid project version! input again~')
              return
            }

            done(null, true)
          }, 0)
        },
        filter (v) {
          if (!!semver.valid(v)) {
            return semver.valid(v)
          } else {
            return v
          }
        }
      },
      {
        type: 'list',
        name: 'projectTemplate',
        message: 'please choose the project template',
        choices () {
          console.log(self.template)
          return self.template.map(item => ({
            value: item.npmName,
            name: item.name
          }))
        }
      }
    ]

    if (type === TYPE_COMPONENT) {
      questions.push({
        type: 'input',
        name: 'componentDescription',
        message: 'please input the description of the component',
        default: '',
        validate (v) {
          const done = this.async()
          setTimeout(() => {
            if (!v) {
              done()
              return
            }

            done(null, true)
          }, 0)
        },
      })
    }

    const answer = await inquirer.prompt(questions)

    return answer
  }

  isDirEmpty (localPath) {
    let fileList = fs.readdirSync(localPath)
    fileList = fileList.filter(file =>
      (!file.startsWith('.') && ['node_modules'].indexOf(file) < 0)
    )
    return !fileList || fileList.length <= 0
  }

  async emptyDirConfirm () {
    const answer = await inquirer.prompt({
      type: 'confirm',
      name: 'ifContinue',
      default: false,
      message: 'Current dir is not empty, yes will remove all files, continue?'
    })

    return answer
  }
}

function init(argv) {
  return new InitCommand(argv)
}

module.exports = init
module.exports.InitCommand = InitCommand