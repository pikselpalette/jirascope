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

    const warningsFilter = this.jirascope.helpers.hasWarnings
    const allowedPrefixFilter = this.jirascope.helpers.hasAllowedIssueKeyPrefixes(this.config.allowedIssueKeyPrefixes)
    const bySortableKey = this.jirascope.helpers.bySortableKey

    const issues = _.chain(this.jirascope.issues).filter(allowedPrefixFilter).orderBy(bySortableKey).value()
    const warnings = _.chain(issues).filter(warningsFilter).value()

    const issuesCount = issues.length
    const warningsCount = warnings.length
    const percentage = issues.length === 0 ? 100 : _.round((warnings.length / issues.length) * 100, 2)

    Logger.global.info(`found ${warningsCount} issues with warnings (total: ${issuesCount}, percentage: ${percentage}%)`)
    warnings.forEach((issue) => {
      Logger.global.info(`[${issue.analysis.warnings.join(', ')}], ${issue.key}, ${issue.summary}, ${issue.type}, ${issue.status}`)
    })
  }
}

exports = module.exports = Warnings
