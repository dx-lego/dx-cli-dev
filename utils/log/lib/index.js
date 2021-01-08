'use strict';

const logger = require('npmlog')

logger.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info'
logger.heading = 'dx'
logger.addLevel('success', 2000, {fg: 'green', bold: true})

module.exports = logger
