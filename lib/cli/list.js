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

    issues.forEach((issue) => {
      Logger.global.info(`${issue.key}, ${issue.summary}, ${issue.type}, ${issue.status}`)
    })
  }
}

exports = module.exports = Warnings
