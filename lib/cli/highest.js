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

    const count = Math.round(this.jirascope.issues.length / 10)
    const highest = _.chain(this.jirascope.issues).filter('analysis.scoreSize').orderBy(['analysis.scoreSize'], ['desc']).take(count).value()

    Logger.global.info(`${highest.length} highest scoring issues`)
    highest.forEach((issue) => {
      Logger.global.info(`${issue.analysis.scoreSize}, ${issue.key}, ${issue.status}, ${issue.summary}`)
    })
  }
}

exports = module.exports = Warnings
