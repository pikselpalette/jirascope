'use strict'

const Logger = require('../util/logger')

class Cleanup {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.cleanup()
    Logger.global.success(`cleaned up`)
  }
}

exports = module.exports = Cleanup
