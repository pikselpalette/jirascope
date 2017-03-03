'use strict'

const Path = require('path')

const JiraClient = require('../common/jiraClient')
const FileStore = require('../common/fileStore')

const Logger = require('../util/logger')
const logger = Logger.global.chain('[repo]')

const linkTypes = [
  'Blocks'
]

async function fetchIssues (jiraClient, jql) {
  const issues = {}

  logger.info(`fetching initial issues`)
  let newIssues = await jiraClient.getIssuesByQuery(jql, 1000)

  while (newIssues.length > 0) {
    newIssues.forEach((newIssue) => {
      issues[newIssue.key] = newIssue
      logger.trace(`${newIssue.key} found`)
    })

    let missingIssues = {}
    logger.info(`reviewing issue links`)
    newIssues.forEach((newIssue) => {
      if (newIssue.links.length === 0) {
        logger.trace(`${newIssue.key} - no links`)
      } else if (newIssue.statusCategory === 'Done' && !this.config.followDone) {
        logger.trace(`${newIssue.key} - skipping as 'Done'`)
      } else {
        logger.trace(`${newIssue.key} - evaluating links`)
        newIssue.links.forEach((link) => {
          if (!issues[link.dstKey]) {
            missingIssues[link.dstKey] = link.dstKey
            logger.trace(`${link.srcKey} ${link.label} ${link.dstKey} - ${link.dstKey} not yet fetched`)
          } else {
            logger.trace(`${link.srcKey} ${link.label} ${link.dstKey} - ${link.dstKey} already fetched`)
          }
        })
      }
    })
    let lookups = Object.keys(missingIssues)
    if (lookups.length > 0) {
      logger.info(`fetching linked issues`)
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
    this.issues = await fetchIssues.call(this, this.jiraClient, this.config.query)
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
