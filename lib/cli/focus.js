'use strict'

const _ = require('lodash')

const Exec = require('child-process-promise').exec

const Logger = require('../util/logger')

class Focus {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()

    const warningsFilter = this.jirascope.helpers.hasWarnings
    const allowedPrefixFilter = this.jirascope.helpers.hasAllowedIssueKeyPrefixes(this.config.allowedIssueKeyPrefixes)
    const bySortableKey = this.jirascope.helpers.bySortableKey

    let warnings = _.chain(this.jirascope.issues).filter(warningsFilter).filter(allowedPrefixFilter).orderBy(bySortableKey).value()

    const count = Math.min(warnings.length, 10)
    const top = _.take(warnings, count)

    Logger.global.info(`focusing on top ${count} issues with warnings`)
    const execs = top.map((issue) => {
      return Exec(`open ${this.config.server}browse/${issue.key}`)
    })
    for (let exec of execs) {
      await exec
    }
  }
}

exports = module.exports = Focus
