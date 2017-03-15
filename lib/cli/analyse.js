'use strict'

const _ = require('lodash')

const Logger = require('../util/logger')

class Analyse {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()
    await this.jirascope.store()

    const hasWarnings = (x) => { return x.analysis.warnings.length > 0 }
    const warnings = _.chain(this.jirascope.issues).filter(hasWarnings).sort('key').value()

    Logger.global.info(`found ${Object.keys(this.jirascope.issues).length} issues`)
    Logger.global.info(`found ${this.jirascope.graphs.length} graphs of issues`)
    if (warnings.length > 0) {
      Logger.global.warn(`found ${warnings.length} issues that have warnings`)
    }
  }
}

exports = module.exports = Analyse
