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

    const warnings = _.chain(this.jirascope.issues).filter(this.jirascope.helpers.hasWarnings).sort('key').value()

    Logger.global.info(`found ${warnings.length} issues with warnings`)
    warnings.forEach((issue) => {
      Logger.global.info(`[${issue.analysis.warnings.join(', ')}], ${issue.key}, ${issue.summary}, ${issue.type}, ${issue.status}`)
    })
  }
}

exports = module.exports = Warnings
