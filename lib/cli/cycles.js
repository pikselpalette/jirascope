'use strict'

const _ = require('lodash')

const Logger = require('../util/logger')

class Cycles {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()
    await this.jirascope.store()

    const cycles = _.chain(this.jirascope.graphs).filter(['analysis.acyclic', false]).sort('key').value()

    Logger.global.info(`found ${cycles.length} graphs with cycles`)
    cycles.forEach((graph) => {
      Logger.global.info(`${graph.label}`)
    })
  }
}

exports = module.exports = Cycles
