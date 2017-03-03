'use strict'

const Logger = require('./util/logger')
const logger = Logger.global.chain('[jirascope]')

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
      } else if (newIssue.statusCategory === 'Done' && !this.options.followDone) {
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

class Jirascope {
  constructor (jiraClient, dataStore, options) {
    this.jiraClient = jiraClient
    this.dataStore = dataStore
    this.options = options
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
    this.issues = await fetchIssues.call(this, this.jiraClient, this.options.query)
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

exports = module.exports = Jirascope
