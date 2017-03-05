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
 * @param {string[]} options.followStatusCategories - An array of status categories to follow
 * @param {string[]} options.followLinkTypes - An array of link types to follow
 *
 * @property {Object} issues - issues keyed by key
 */
class Jirascope {
  constructor (jiraClient, dataStore, options) {
    this.jiraClient = jiraClient
    this.dataStore = dataStore
    this.options = options
    this.issues = {}
    this.orphans = []
    this.graphs = []
  }

  async populate () {
    if (this.dataStore) {
      this.issues = await this.dataStore.readData('issues')
    }
    if (!this.issues) {
      await this.fetch()
    }
    this.analyse()
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
        newIssue.links = newIssue.links.filter((link) => { return this.options.followLinkTypes.includes(link.type) })
        if (newIssue.links.length === 0) {
          logger.trace(`${newIssue.key} - no links`)
        } else if (!this.options.followStatusCategories.includes(newIssue.statusCategory)) {
          logger.trace(`${newIssue.key} - skipping due to status category of '${newIssue.statusCategory}'`)
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

  analyse () {
    const orphans = []
    const graphs = []
    const issues = Object.assign({}, this.issues)
    while (Object.keys(issues).length !== 0) {
      Logger.global.trace(`issues left to consider: ${Object.keys(issues).length}`)
      const stack = Object.keys(issues).splice(0, 1) // seed the stack
      if (stack.length !== 0) {
        const graph = {
          nodes: [],
          edges: []
        }
        Logger.global.trace(`starting a new graph with ${stack}`)
        while (stack.length !== 0) {
          const key = stack.pop()
          Logger.global.trace(`considering ${key}, remaining stack is ${stack}`)
          const issue = issues[key]
          if (issue) {
            graph.nodes.push(issue)
            delete issues[key]
            issue.links.forEach((link) => {
              if (this.issues[link.srcKey] && this.issues[link.dstKey]) { // only include edges that we have issues for
                if (link.direction === 'inward') {
                  graph.edges.push(link)
                  stack.unshift(link.dstKey)
                }
              }
            })
          }
        }
        if (graph.nodes.length === 1) {
          orphans.push(graph.nodes[0])
        } else {
          graphs.push(graph)
        }
      }
    }
    this.orphans = orphans
    this.graphs = graphs
  }

  async store () {
    if (this.dataStore) {
      await this.dataStore.writeData('issues', this.issues)
      await this.dataStore.writeData('orphans', this.orphans)
      await this.dataStore.writeData('graphs', this.graphs)
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
