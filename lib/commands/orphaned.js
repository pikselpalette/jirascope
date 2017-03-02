'use strict'

const Repository = require('../common/repository')

class Orphaned {
  constructor (config) {
    this.config = config
    this.repository = new Repository(config)
  }

  async run () {
    await this.repository.populate()
    Object.values(this.repository.issues).forEach((issue) => {
      if (issue.links.length === 0) {
        console.log(`${issue.key}, ${issue.status}, ${issue.summary}`)
      }
    })
  }
}

exports = module.exports = Orphaned
