'use strict'

const Logger = require('../util/logger')
const Repository = require('../common/repository')

class Orphaned {
  constructor (config) {
    this.config = config
    this.repository = new Repository(config)
  }

  async run () {
    await this.repository.populate()
    let count = 0
    Object.values(this.repository.issues).forEach((issue) => {
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
