'use strict'

const Logger = require('./util/logger')
const logger = Logger.global.chain('[jirascope]')

/**
 * Provides an understanding of jira issues and their network.
 *
 * @param {Object} jiraClient - The client to use to talk to JIRA
 * @param {Object?} dataStore - The data store to use
 * @param {Object} options - Options to customise behaviour
 * @param {string} options.query - The initial query to use
 * @param {boolean} options.followDone - Indicates if done tickets should be followed
 * @param {string[]} options.linkTypes - An array of link types to follow
 *
 * @property {Object} issues - issues keyed by key
 */
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
    const issues = {}
    logger.info(`fetching initial issues`)
    let newIssues = await this.jiraClient.getIssuesByQuery(this.options.query, 1000)

    while (newIssues.length > 0) {
      newIssues.forEach((newIssue) => {
        issues[newIssue.key] = newIssue
        logger.trace(`${newIssue.key} found`)
      })

      let missingIssues = {}
      logger.info(`reviewing issue links`)
      newIssues.forEach((newIssue) => {
        newIssue.links = newIssue.links.filter((link) => { return this.options.linkTypes.includes(link.type) })
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
        newIssues = await this.jiraClient.getIssuesByKey(lookups)
      } else {
        newIssues = []
      }
    }
    this.issues = issues
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
