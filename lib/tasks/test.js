'use strict'

const Logger = require('../common/logger')

class Test {
  constructor (config) {
    this.config = config
    this.logger = new Logger(config)
  }

  async run () {
    this.logger.success(JSON.stringify(this.config, null, 2))
    return
  }
}

exports = module.exports = Test
