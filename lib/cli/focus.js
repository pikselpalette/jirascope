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

    let warnings = this.jirascope.warnings
    this.config.input.forEach((input) => {
      warnings = _.filter(warnings, (key) => {
        return _.startsWith(key, input)
      })
    })

    const count = Math.min(warnings.length, 10)
    const top = _.take(warnings, count)

    Logger.global.info(`focusing on top ${count} issues with warnings`)
    const execs = top.map((key) => {
      const issue = this.jirascope.issues[key]
      return Exec(`open ${this.config.server}browse/${issue.key}`)
    })
    for (let exec of execs) {
      await exec
    }
  }
}

exports = module.exports = Focus
