'use strict'

const _ = require('lodash')

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
 * @property {Object} issues - all significant issues keyed by key
 * @property {Object[]} graphs - array of distrinct graphs containing 'nodes' and 'edges'
 * @property {Object[]} graphs.nodes - array of nodes in the graph, each element being an issue
 * @property {Object[]} graphs.edges - array of edges in the graph, each element being a link
 * @property {Object} orphans - array of issue keys that are considered orphans (i.e. have no links)
 * @property {Object} roots - array of issue keys that are considered roots (i.e. are a root node of a graph)
 * @property {Object} leaves - array of issue keys that are considered leaves (i.e. are a leaf node of a graph)
 * @property {Object} problems - array of issue keys that have been flagged with problems
 */
class Jirascope {
  constructor (jiraClient, dataStore, options) {
    this.jiraClient = jiraClient
    this.dataStore = dataStore
    this.options = options
    this.issues = {}
    this.graphs = []
    this.orphans = []
    this.roots = []
    this.leaves = []
    this.problems = []
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
      let missingIssues = {}
      newIssues.forEach((newIssue) => {
        issues[newIssue.key] = newIssue
        logger.trace(`${newIssue.key} - new issue found`)

        newIssue.links = newIssue.links.filter((link) => {
          return this.options.followLinkTypes.includes(link.type)
        })

        if (newIssue.links.length === 0) {
          logger.trace(`${newIssue.key} - no significant links`)
        } else if (!this.options.followStatusCategories.includes(newIssue.statusCategory)) {
          logger.trace(`${newIssue.key} - skipping evaluating links due to status category of '${newIssue.statusCategory}'`)
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
    const graphs = []
    const orphans = []
    const roots = []
    const leaves = []
    const problems = []
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
              problems: []
            }
            issue.links.forEach((link) => {
              if (this.issues[link.srcKey] && this.issues[link.dstKey]) { // only include edges that we have issues for
                stack.unshift(link.dstKey) // follow both directions
                if (link.direction === 'inward') {
                  issue.analysis.leaf = false
                  issue.analysis.orphan = false
                  graph.edges.push(link) // but only add the inward to the graph edges for neatness / DAG
                  if (issue.statusCategory === 'Done' && link.dstStatusCategory !== 'Done') {
                    issue.analysis.problems.push('doneButBlocked')
                  }
                }
                if (link.direction === 'outward') {
                  issue.analysis.root = false
                  issue.analysis.orphan = false
                }
              }
            })

            if (issue.analysis.orphan) {
              orphans.push(issue.key)
            } else if (issue.analysis.root) {
              roots.push(issue.key)
            } else if (issue.analysis.leaf) {
              leaves.push(issue.key)
            }

            if (issue.analysis.problems.length > 0) {
              problems.push(issue.key)
            }
          }
        }
        if (graph.nodes.length > 1) {
          graph.size = graph.nodes.length
          graph.label = _.chain(graph.nodes).filter('analysis.root').sortBy('key').map('key').value().join('|')
          graph.nodes = _.orderBy(graph.nodes, ['key'], ['asc'])
          graph.edges = _.orderBy(graph.edges, ['srcKey', 'dstKey'], ['asc', 'asc'])
          graphs.push(graph)
        }
      }
    }
    this.graphs = _.orderBy(graphs, ['size'], ['desc'])
    this.orphans = orphans.sort()
    this.roots = roots.sort()
    this.leaves = leaves.sort()
    this.problems = problems.sort()
  }

  async store () {
    if (this.dataStore) {
      await this.dataStore.writeData('issues', this.issues)
      await this.dataStore.writeData('graphs', this.graphs)
      await this.dataStore.writeData('orphans', this.orphans)
      await this.dataStore.writeData('roots', this.roots)
      await this.dataStore.writeData('leaves', this.leaves)
      await this.dataStore.writeData('problems', this.problems)
    }
  }

  async cleanup () {
    this.issues = {}
    if (this.dataStore) {
      await this.dataStore.deleteData('issues')
      await this.dataStore.deleteData('graphs')
      await this.dataStore.deleteData('orphans')
      await this.dataStore.deleteData('roots')
      await this.dataStore.deleteData('leaves')
      await this.dataStore.deleteData('problems')
    }
  }
}

Jirascope.PROBLEM_TYPES = [
  'doneButBlocked'
]

exports = module.exports = Jirascope
