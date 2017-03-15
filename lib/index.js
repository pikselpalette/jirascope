'use strict'

const _ = require('lodash')

const Logger = require('./util/logger')
const logger = Logger.global.chain('[jirascope]')

function isAllowedProjectKey (issue, allowedProjectKeys) {
  if (allowedProjectKeys.length === 0) {
    return true
  }
  return _.some(allowedProjectKeys, (allowedProjectKey) => { return _.startsWith(issue.key, allowedProjectKey) })
}

function populateFakeEpicLinks (epicIssue, childIssues) {
  childIssues.forEach((childIssue) => {
    epicIssue.links.push({
      direction: 'inward',
      dstKey: childIssue.key,
      dstStatus: childIssue.status,
      dstStatusCategory: childIssue.statusCategory,
      label: 'is delivered by',
      srcKey: epicIssue.key,
      type: 'Epic'
    })
    childIssue.links.push({
      direction: 'outward',
      dstKey: epicIssue.key,
      dstStatus: epicIssue.status,
      dstStatusCategory: epicIssue.statusCategory,
      label: 'delivers',
      srcKey: childIssue.key,
      type: 'Epic'
    })
  })
}

function processNewIssues (issues, newIssues) {
  let unvisitedIssues = {}
  let epicIssues = {}
  newIssues.forEach((newIssue) => {
    logger.trace(`${newIssue.key} - new issue found`)

    // filter out issues if they have the wrong prefix
    if (!isAllowedProjectKey(newIssue, this.options.allowedProjectKeys)) {
      logger.trace(`${newIssue.key} - not in allowed project keys - skipping`)
      return
    }

    // filter out links if not in the desired link types
    newIssue.links = newIssue.links.filter((link) => {
      return this.options.followLinkTypes.includes(link.type)
    })

    // filter out links if both nodes are not in the desired status categories
    newIssue.links = newIssue.links.filter((link) => {
      return this.options.followStatusCategories.includes(newIssue.statusCategory) ||
          this.options.followStatusCategories.includes(link.dstStatusCategory)
    })

    // filter out issues if they only have outward links and are not in the desired status categories
    if (_.every(newIssue.links, {direction: 'outward'}) &&
        !this.options.followStatusCategories.includes(newIssue.statusCategory)) {
      logger.trace(`${newIssue.key} - not in desired status categories with only outward links - skipping`)
      return
    }

    issues[newIssue.key] = newIssue // lets keep it!

    if (newIssue.links.length === 0) {
      logger.trace(`${newIssue.key} - no significant links`)
    } else {
      logger.trace(`${newIssue.key} - evaluating links`)
      newIssue.links.forEach((link) => {
        if (!issues[link.dstKey]) {
          unvisitedIssues[link.dstKey] = link.dstKey
          logger.trace(`${link.srcKey} ${link.label} ${link.dstKey} - ${link.dstKey} not yet fetched`)
        } else {
          logger.trace(`${link.srcKey} ${link.label} ${link.dstKey} - ${link.dstKey} already fetched`)
        }
      })
    }

    if (newIssue.epicKey && !issues[newIssue.epicKey]) {
      unvisitedIssues[newIssue.epicKey] = newIssue.epicKey
      logger.trace(`${newIssue.key} - ${newIssue.epicKey} epic not yet fetched`)
    }

    if (newIssue.type === 'Epic') {
      epicIssues[newIssue.key] = newIssue
      logger.trace(`${newIssue.key} - is an epic`)
    }
  })
  const unvisitedIssueKeys = Object.keys(unvisitedIssues)
  return {unvisitedIssueKeys, epicIssues}
}

async function fetchNewIssues (unvisitedIssueKeys, epicIssues) {
  let newIssues = []
  if (unvisitedIssueKeys.length > 0) {
    logger.info(`fetching linked issues`)
    newIssues = newIssues.concat(await this.jiraClient.getIssuesByKey(unvisitedIssueKeys))
  }
  for (let epicIssueKey in epicIssues) {
    logger.info(`${epicIssueKey} - fetching epic child issues`)
    const childIssues = await this.jiraClient.getIssuesByQuery(`"Epic Link" = ${epicIssueKey}`, 1000)
    logger.trace(`${epicIssueKey} - found ${Object.keys(childIssues).length} child issues`)
    newIssues = newIssues.concat(childIssues)
    populateFakeEpicLinks(epicIssues[epicIssueKey], childIssues)
  }
  return newIssues
}

/**
 * Provides an understanding of jira issues and their network.
 *
 * @param {Object} jiraClient - The client to use to talk to JIRA
 * @param {Object?} dataStore - The data store to use
 * @param {Object} options - Options to customise behaviour
 * @param {string} options.query - The initial query to use
 * @param {string[]} options.followStatusCategories - An array of status categories to follow
 * @param {string[]} options.followLinkTypes - An array of link types to follow
 * @param {string[]} options.allowedRootIssueTypes - An array of types that are allowed to mark valid root issues
 * @param {string[]} options.allowedProjectKeys - An array of project keys that are allowed, or empty for any
 *
 * @property {Object} issues - all significant issues keyed by key
 * @property {Object[]} graphs - array of distrinct graphs containing 'nodes' and 'edges'
 * @property {Object[]} graphs.nodes - array of nodes in the graph, each element being an issue
 * @property {Object[]} graphs.edges - array of edges in the graph, each element being a link
 */
class Jirascope {
  constructor (jiraClient, dataStore, options) {
    this.jiraClient = jiraClient
    this.dataStore = dataStore
    this.options = options
    this.issues = {}
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
    newIssues.forEach((newIssue) => { issues[newIssue.key] = newIssue }) // initial issues we always keep

    while (newIssues.length > 0) {
      const { unvisitedIssueKeys, epicIssues } = processNewIssues.call(this, issues, newIssues)
      newIssues = await fetchNewIssues.call(this, unvisitedIssueKeys, epicIssues)
    }
    this.issues = issues
  }

  analyse () {
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
            issue.analysis = {
              orphan: true,
              root: true,
              leaf: true,
              warnings: []
            }

            issue.links.forEach((link) => {
              if (this.issues[link.srcKey] && this.issues[link.dstKey]) { // only include edges that we have issues for
                stack.unshift(link.dstKey) // follow both directions
                if (link.direction === 'inward') {
                  issue.analysis.leaf = false
                  issue.analysis.orphan = false
                  graph.edges.push(link) // but only add the inward to the graph edges for neatness / DAG
                  if (issue.statusCategory === 'Done' && link.dstStatusCategory !== 'Done') {
                    issue.analysis.warnings.push('doneButBlocked')
                  }
                }
                if (link.direction === 'outward') {
                  issue.analysis.root = false
                  issue.analysis.orphan = false
                }
              }
            })

            if (issue.analysis.orphan && !this.options.allowedRootIssueTypes.includes(issue.type)) {
              issue.analysis.warnings.push('orphaned')
              issue.analysis.root = false
              issue.analysis.leaf = false
            }

            if (issue.analysis.root && !this.options.allowedRootIssueTypes.includes(issue.type)) {
              issue.analysis.warnings.push('invalidRoot')
            }
          }
        }
        if (graph.nodes.length > 1) {
          graph.analysis = {
            size: graph.nodes.length
          }
          graph.label = _.chain(graph.nodes).filter('analysis.root').sortBy('key').map('key').value().join('|')
          graph.nodes = _.orderBy(graph.nodes, ['key'], ['asc'])
          graph.edges = _.orderBy(graph.edges, ['srcKey', 'dstKey'], ['asc', 'asc'])
          graphs.push(graph)
        }
      }
    }
    this.graphs = _.orderBy(graphs, ['analysis.size'], ['desc'])
  }

  warnings () {
    const hasWarnings = (x) => { return x.analysis.warnings.length > 0 }
    const warnings = _.chain(this.issues).filter(hasWarnings).sort('key').value()
    return warnings
  }

  async store () {
    if (this.dataStore) {
      await this.dataStore.writeData('issues', this.issues)
      await this.dataStore.writeData('graphs', this.graphs)
    }
  }

  async cleanup () {
    this.issues = {}
    if (this.dataStore) {
      await this.dataStore.deleteData('issues')
      await this.dataStore.deleteData('graphs')
    }
  }
}

Jirascope.warningTypes = {
  doneButBlocked: {
    label: 'Done But Blocked'
  },
  invalidRoot: {
    label: 'Invalid Root'
  },
  orphaned: {
    label: 'Orphaned'
  }
}

exports = module.exports = Jirascope
