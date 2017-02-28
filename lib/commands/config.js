'use strict'

const Logger = require('../util/logger')

class Config {
  constructor (config) {
    this.config = config
  }

  async run () {
    Logger.global.success(JSON.stringify(this.config, null, 2))
    return
  }
}

exports = module.exports = Config
