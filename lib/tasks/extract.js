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
    const issues = await this.repository.issues()
    this.logger.success(JSON.stringify(issues, null, 2))
    return
  }
}

exports = module.exports = Extract
