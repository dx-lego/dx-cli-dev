'use strict';

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')

function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null
  }

  const finalRegistry = registry || getDefaultRegistry()
  const npmInfoUrl = urlJoin(finalRegistry, npmName)

  return axios.get(npmInfoUrl).then(res => {
    if (res.status === 200) {
      return res.data
    } else {
      return null
    }
  }).catch(err => {
    return Promise.reject(err)
  })
}

function getDefaultRegistry (isOriginal = true) {
  return isOriginal ? 'https://registry.npmjs.org/' : 'https://registry.npmjs.taobao.org/'
}

async function getNpmVersions (npmName, registry) {
  const data = await getNpmInfo(npmName, registry)
  if (data) {
    return Object.keys(data.versions)
  } else {
    return []
  }
}

function getSemverVersions (baseVersion, versions) {
  versions = versions.filter(version => {
    return semver.satisfies(version, `^${baseVersion}`)
  }).sort(getSortFunc(true))

  return versions
}

async function getNpmSemverVersions (baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry)
  const semverVersions = getSemverVersions(baseVersion, versions)

  if (semverVersions && semverVersions.length > 0) {
    return semverVersions[0]
  } else {
    return null
  }
}

async function getNpmLatestVersion (npmName, registry) {
  let versions = await getNpmVersions(npmName, registry)
  if (versions) {
    const sortedVersions = versions.sort(getSortFunc(true))
    return sortedVersions[0]
  }

  return null
}

function getSortFunc (reverse = false) {
  if (reverse) {
    return (a, b) => {
      if (semver.gt(b, a)) {
        return 1
      }

      return -1
    }
  } else {
    return (a, b) => {
      if (semver.gt(a, b)) {
        return 1
      }

      return -1
    }
  }
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersions,
  getDefaultRegistry,
  getNpmLatestVersion,
}