'use strict'

const Path = require('path')

const JiraClient = require('../common/jiraClient')
const FileStore = require('../common/fileStore')

const Logger = require('../util/logger')

async function fetchIssues (jiraClient, jql) {
  const issues = {}
  const lookups = []

  Logger.global.info(`fetching initial issues using query`)
  const issueList = await jiraClient.getIssues(jql)

  issueList.forEach((issue) => {
    issues[issue.key] = issue
    Logger.global.trace(`found ${issue.key}`)
  })

  Logger.global.info(`traversing links from initial query`)
  Object.entries(issues).forEach(([, issue]) => {
    issue.links.forEach((link) => {
      if (!issues[link.key]) {
        lookups.push(link.key)
        Logger.global.trace(`${issue.key} ${link.desc} ${link.key} - lookup required for ${link.key}`)
      } else {
        Logger.global.trace(`${issue.key} ${link.desc} ${link.key} - ${link.key} already fetched`)
      }
    })
  })

  Logger.global.info(`fetching lookup issues by key`)
  while (lookups.length > 0) {
    Logger.global.trace(`${lookups.length} lookups remaining`)
    let lookup = lookups.shift()
    let issue = await jiraClient.getIssue(lookup)
    if (issue) {
      issues[issue.key] = issue
      Logger.global.trace(`found ${issue.key}`)
      issue.links.forEach((link) => {
        if (!issues[link.key]) {
          lookups.push(link.key)
          Logger.global.trace(`${issue.key} ${link.desc} ${link.key} - lookup required for ${link.key}`)
        } else {
          Logger.global.trace(`${issue.key} ${link.desc} ${link.key} - ${link.key} already fetched`)
        }
      })
    }
  }

  return issues
}

class Repository {
  constructor (config) {
    this.config = config
    this.jiraClient = new JiraClient(config.server, config.username, config.password)
    if (this.config.path) {
      this.dataStore = new FileStore(Path.join(Path.dirname(this.config.config), this.config.path))
    }
    this.issues = {}
  }

  async populate () {
    if (this.dataStore) {
      this.issues = await this.dataStore.readData('issues')
    }
    if (!this.issues) {
      await this.fetch()
    }
  }

  async fetch () {
    this.issues = await fetchIssues(this.jiraClient, this.config.query)
  }

  async store () {
    if (this.dataStore) {
      await this.dataStore.writeData('issues', this.issues)
    }
  }

  async cleanup () {
    this.issues = {}
    if (this.dataStore) {
      await this.dataStore.deleteData('issues')
    }
  }
}

exports = module.exports = Repository
