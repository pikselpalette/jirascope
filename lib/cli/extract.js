'use strict'

const Logger = require('../util/logger')

class Extract {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.fetch()
    await this.jirascope.store()
    Logger.global.success(`extracted ${Object.keys(this.jirascope.issues).length} issues`)
    return
  }
}

exports = module.exports = Extract
