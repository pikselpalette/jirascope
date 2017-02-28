'use strict'

const Logger = require('../util/logger')
const Repository = require('../common/repository')

class Extract {
  constructor (config) {
    this.config = config
    this.repository = new Repository(config)
  }

  async run () {
    this.config.readFromCache = false
    const issues = await this.repository.issues()
    Logger.global.success(`extracted ${Object.keys(issues).length} issues`)
    return
  }
}

exports = module.exports = Extract
