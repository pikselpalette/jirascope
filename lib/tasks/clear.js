'use strict'

class Clear {
  constructor (config) {
    this.config = config
  }

  async run () {
    this.logger.success(`TODO`)
  }
}

exports = module.exports = Clear
