'use strict'

const Path = require('path')

const Jira = require('../common/jira')
const Store = require('../common/store')
const Logger = require('../common/logger')

class Extract {
  constructor (config) {
    this.config = config
    this.jira = new Jira(config)
    this.store = new Store(config)
    this.logger = new Logger(config)
  }

  async run () {
    const file = Path.join(this.config.path, 'cache', 'issues.json')

    const list = await this.jira.search(this.config.jql)
    var data = list.issues.reduce(function (acc, cur) {
      acc[cur.key] = cur
      return acc
    }, {})

    await this.store.write(file, data)

    this.logger.success(`extracted to ${file}`)
    return
  }
}

exports = module.exports = Extract
