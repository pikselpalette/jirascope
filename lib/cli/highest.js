'use strict'

const _ = require('lodash')

const Logger = require('../util/logger')

class Warnings {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()
    await this.jirascope.store()

    const allowedPrefixFilter = this.jirascope.helpers.hasAllowedIssueKeyPrefixes(this.config.allowedIssueKeyPrefixes)

    const issues = _.chain(this.jirascope.issues).filter(allowedPrefixFilter).value()

    const count = Math.round(issues.length / 10)
    const highest = _.chain(issues).filter('analysis.totalScore').orderBy(['analysis.totalScore'], ['desc']).take(count).value()

    Logger.global.info(`${highest.length} highest scoring issues (top 10%)`)
    highest.forEach((issue) => {
      Logger.global.info(`${issue.analysis.totalScore}, ${issue.key}, ${issue.summary}, ${issue.status}`)
    })
  }
}

exports = module.exports = Warnings
