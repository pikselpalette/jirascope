'use strict'

const Logger = require('../util/logger')

class Orphaned {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()
    await this.jirascope.store()
    Logger.global.info(`found ${this.jirascope.orphans.length} orphaned issues`)
  }
}

exports = module.exports = Orphaned
