'use strict';

const path = require('path')
const utils = require('@dx-cli-dev/utils')
const pkgDir = require('pkg-dir').sync
const formatPath = require('@dx-cli-dev/format-path')
const npmInstall = require('npminstall')
const {getDefaultRegistry, getNpmLatestVersion} = require('@dx-cli-dev/get-npm-info')
const pathExists = require('path-exists').sync
const fsExtra = require('fs-extra')

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('options of Package can\'t be undefined')
    }

    if (!utils.isObject(options)) {
      throw new Error('options must be object(Array is also not allowed)')
    }

    this.targetPath = options.targetPath
    this.storeDir = options.storeDir
    this.packageName = options.packageName
    this.packageVersion = options.packageVersion
    this.cacheFilePathPrefix = this.packageName.replace('/', '_')
  }

  get cacheFilePath () {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
  }

  getSpecificCacheFilePath (packageVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`)
  }

  async prepare () {
    if (this.storeDir && !pathExists(this.storeDir)) {
      fsExtra.mkdirpSync(this.storeDir)
    }

    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName)
    }
  }

  async exists () {
    if (this.storeDir) {
      await this.prepare()
      return pathExists(this.cacheFilePath)
    } else {
      return pathExists(this.targetPath)
    }
  }

  async install () {
    await this.prepare()
    return npmInstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{
        name: this.packageName,
        version: this.packageVersion
      }]
    })
  }

  async update () {
    await this.prepare()
    const latestPackageVersion = await getNpmLatestVersion(this.packageName)
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion)
    if (!pathExists(latestFilePath)) {
      await npmInstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{
          name: this.packageName,
          version: latestPackageVersion
        }]
      })
    }
    this.packageVersion = latestPackageVersion

    return latestFilePath
  }

  getRootFile () {
    function _getRootFile (targetPath) {
      const dir = pkgDir(targetPath)
      if (dir) {
        const pkgFile = require(path.resolve(dir, 'package.json'))
        if (pkgFile && pkgFile.main) {
          return formatPath(path.resolve(dir, pkgFile.main))
        }
      }

      return null
    }

    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath)
    } else {
      return _getRootFile(this.targetPath)
    }
  }

}

module.exports = Package
