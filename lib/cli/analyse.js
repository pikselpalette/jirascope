'use strict'

const Logger = require('../util/logger')

class Analyse {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()
    await this.jirascope.store()
    Logger.global.info(`found ${Object.keys(this.jirascope.issues).length} issues`)
    Logger.global.info(`found ${this.jirascope.graphs.length} graphs of issues`)
    Logger.global.info(`found ${this.jirascope.roots.length} root issues`)
    Logger.global.info(`found ${this.jirascope.leaves.length} leaf issues`)
    Logger.global.info(`found ${this.jirascope.orphans.length} orphaned issues`)
    if (this.jirascope.incompleteDones.length > 0) {
      Logger.global.warn(`found ${this.jirascope.incompleteDones.length} done issues that are incomplete`)
    }
  }
}

exports = module.exports = Analyse
