'use strict'

const Logger = require('../util/logger')

class Orphaned {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()
    let count = 0
    Object.values(this.jirascope.issues).forEach((issue) => {
      if (issue.statusSummary === 'Done') {
        return
      }
      if (issue.links.length === 0) {
        console.log(`${issue.key}, ${issue.status}, ${issue.summary}`)
        count++
      }
    })
    Logger.global.success(`found ${count} orphaned issues`)
  }
}

exports = module.exports = Orphaned
