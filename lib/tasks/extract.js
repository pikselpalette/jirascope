'use strict'

const Jira = require('../common/jira')
const Logger = require('../common/logger')

class Extract {
  constructor (config) {
    this.config = config
    this.jira = new Jira(config)
    this.logger = new Logger(config)
  }

  async run () {
    const list = await this.jira.search(this.config.jql)
    this.logger.success(JSON.stringify(list, null, 2))
    return
  }
}

exports = module.exports = Extract
