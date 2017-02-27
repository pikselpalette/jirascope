'use strict'

const Path = require('path')

const JiraClient = require('../common/jiraClient')
const Store = require('../common/store')

class Repository {
  constructor (config) {
    this.config = config
    this.jiraClient = new JiraClient(config)
    this.store = new Store(config)
    this.cacheDir = Path.join(this.config.path, 'cache')
  }

  async issues () {
    const list = await this.jiraClient.search(this.config.jql)

    var issues = list.issues.reduce(function (acc, cur) {
      acc[cur.key] = cur
      return acc
    }, {})

    await this.store.write(Path.join(this.cacheDir, 'issues.json'), issues)

    return issues
  }
}

exports = module.exports = Repository
