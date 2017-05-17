'use strict'

const Logger = require('../util/logger')

class Extract {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.fetch()
    await this.jirascope.tidy()
    await this.jirascope.store()
    Logger.global.info(`extracted ${this.jirascope.issues.length} issues`)
    return
  }
}

exports = module.exports = Extract
