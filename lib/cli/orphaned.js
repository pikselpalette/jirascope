'use strict'

const Logger = require('../util/logger')

class Orphaned {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()
    let orphans = []
    Object.values(this.jirascope.issues).forEach((issue) => {
      if (issue.statusSummary === 'Done') {
        return
      }
      if (issue.links.length === 0) {
        orphans.push(issue)
        console.log(`${issue.key}, ${issue.status}, ${issue.summary}`)
      }
    })
    Logger.global.success(`found ${orphans.length} orphaned issues`)
  }
}

exports = module.exports = Orphaned
