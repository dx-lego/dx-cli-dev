const request = require('@dx-cli-dev/request')

module.exports = function () {
  return request({
    url: 'project/getTemplate'
  })
}