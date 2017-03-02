'use strict'

const Path = require('path')

const JiraClient = require('../common/jiraClient')
const FileStore = require('../common/fileStore')

const Logger = require('../util/logger')

async function fetchIssues (jiraClient, jql) {
  const issues = {}

  Logger.global.info(`fetching initial issues using query`)
  let newIssues = await jiraClient.getIssuesByQuery(jql, 0, 1000)

  while (newIssues.length > 0) {
    newIssues.forEach((newIssue) => {
      issues[newIssue.key] = newIssue
      Logger.global.trace(`found ${newIssue.key}`)
    })

    let missingIssues = {}
    Logger.global.info(`reviewing new issues for links`)
    newIssues.forEach((newIssue) => {
      if (newIssue.statusCategory !== 'Done') { // don't follow links if the issue is done
        newIssue.links.forEach((link) => {
          if (!issues[link.key]) {
            missingIssues[link.key] = link.key
            Logger.global.trace(`${newIssue.key} ${link.desc} ${link.key} - ${link.key} not yet fetched`)
          } else {
            Logger.global.trace(`${newIssue.key} ${link.desc} ${link.key} - ${link.key} already fetched`)
          }
        })
      }
    })
    let lookups = Object.keys(missingIssues)
    if (lookups.length > 0) {
      newIssues = await jiraClient.getIssuesByKey(lookups)
    } else {
      newIssues = []
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
