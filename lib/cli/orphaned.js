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
    this.jirascope.orphans.forEach((key) => {
      const issue = this.jirascope.issues[key]
      Logger.global.info(`${issue.key}, ${issue.status}, ${issue.summary}`)
    })
  }
}

exports = module.exports = Orphaned
