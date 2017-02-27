'use strict'

const Logger = require('../common/logger')
const Repository = require('../common/repository')

class Extract {
  constructor (config) {
    this.config = config
    this.logger = new Logger(config)
    this.repository = new Repository(config)
  }

  async run () {
    this.config.readFromCache = false
    const issues = await this.repository.issues()
    this.logger.success(`extracted ${Object.keys(issues).length} issues`)
    return
  }
}

exports = module.exports = Extract
