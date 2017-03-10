'use strict'

const Logger = require('../util/logger')

class Warnings {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()
    await this.jirascope.store()
    Logger.global.info(`found ${this.jirascope.warnings.length} issues with warnings`)
    this.jirascope.warnings.forEach((key) => {
      const issue = this.jirascope.issues[key]
      Logger.global.info(`[${issue.analysis.warnings.join(', ')}], ${issue.key}, ${issue.status}, ${issue.summary}`)
    })
  }
}

exports = module.exports = Warnings
