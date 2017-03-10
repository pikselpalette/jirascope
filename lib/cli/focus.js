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

    const count = Math.min(this.jirascope.warnings.length, 10)

    Logger.global.info(`focusing on top ${count} issues with warnings`)
    const execs = _.take(this.jirascope.warnings, 10).map((key) => {
      const issue = this.jirascope.issues[key]
      return Exec(`open ${this.config.server}browse/${issue.key}`)
    })
    for (let exec of execs) {
      await exec
    }
  }
}

exports = module.exports = Focus
