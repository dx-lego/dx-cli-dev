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
  }).sort((a, b) => {
    return semver.gt(b, a)
  })

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

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersions
}