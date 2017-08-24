'use strict'

const _ = require('lodash')

const Logger = require('../util/logger')

class Roots {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()
    await this.jirascope.store()

    const trackerFilter = this.jirascope.helpers.isTracker
    const allowedPrefixFilter = this.jirascope.helpers.hasAllowedIssueKeyPrefixes(this.config.allowedIssueKeyPrefixes)

    const issues = _.chain(this.jirascope.issues).filter(allowedPrefixFilter).orderBy(['analysis.totalScore'], ['desc']).value()
    const roots = _.chain(issues).filter(trackerFilter).value()

    const issuesCount = issues.length
    const rootsCount = roots.length
    const percentage = issues.length === 0 ? 100 : _.round((roots.length / issues.length) * 100, 2)

    Logger.global.info(`found ${rootsCount} tracker issues (total: ${issuesCount}, percentage: ${percentage}%)`)
    roots.forEach((issue) => {
      Logger.global.info(`${issue.analysis.totalScore}, ${this.config.server}browse/${issue.key}, ${issue.summary}, ${issue.type}, ${issue.status}`)
    })
  }
}

exports = module.exports = Roots
