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

    const warnings = _.chain(this.jirascope.issues).filter(this.jirascope.helpers.hasWarnings).value()
    const cycles = _.chain(this.jirascope.graphs).filter(['analysis.acyclic', false]).value()

    Logger.global.info(`found ${this.jirascope.issues.length} issues`)
    Logger.global.info(`found ${this.jirascope.graphs.length} graphs of issues`)
    Logger.global.info(`found ${this.jirascope.subgraphs.length} subgraphs of issues`)
    Logger.global.warn(`found ${warnings.length} issues that have warnings`)
    Logger.global.warn(`found ${cycles.length} graphs that are cyclic`)
  }
}

exports = module.exports = Analyse
