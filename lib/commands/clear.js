'use strict'

const Logger = require('../util/logger')

class Clear {
  constructor (config) {
    this.config = config
  }

  async run () {
    Logger.global.success(`TODO`)
  }
}

exports = module.exports = Clear
