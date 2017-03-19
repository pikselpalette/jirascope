'use strict'

const _ = require('lodash')

const Logger = require('./util/logger')
const logger = Logger.global.chain('[jirascope]')

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

function processNewIssues (issuesByKey, newIssues) {
  let unvisitedIssues = {}
  let epicIssues = {}
  newIssues.forEach((newIssue) => {
    logger.trace(`${newIssue.key} - new issue found`)

    // filter out issues if they have the wrong prefix
    if (!helpers.isAllowedProjectKey(newIssue.key, this.options.allowedProjectKeys)) {
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

    issuesByKey[newIssue.key] = newIssue // lets keep it!

    if (newIssue.links.length === 0) {
      logger.trace(`${newIssue.key} - no significant links`)
    } else {
      logger.trace(`${newIssue.key} - evaluating links`)
      newIssue.links.forEach((link) => {
        if (!issuesByKey[link.dstKey]) {
          unvisitedIssues[link.dstKey] = link.dstKey
          logger.trace(`${link.srcKey} ${link.label} ${link.dstKey} - ${link.dstKey} not yet fetched`)
        } else {
          logger.trace(`${link.srcKey} ${link.label} ${link.dstKey} - ${link.dstKey} already fetched`)
        }
      })
    }

    if (newIssue.epicKey && !issuesByKey[newIssue.epicKey]) {
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

function determineGraphs () {
  const graphs = []
  const issues = _.keyBy(this.issues, 'key')
  while (Object.keys(issues).length !== 0) {
    logger.trace(`issues left to consider: ${Object.keys(issues).length}`)
    const stack = Object.keys(issues).splice(0, 1) // seed the stack
    if (stack.length !== 0) {
      const graph = {
        nodes: [],
        edges: []
      }
      logger.trace(`starting a new graph with ${stack}`)
      while (stack.length !== 0) {
        const key = stack.pop()
        const issue = issues[key]
        logger.trace(`${key}: considering`)
        if (issue) {
          const node = _.omit(issue, ['links'])
          node.edges = []
          graph.nodes.push(node)
          delete issues[key]
          node.analysis = issue.analysis = {
            orphan: true,
            root: true,
            leaf: true,
            warnings: []
          }

          issue.links.forEach((link) => {
            stack.unshift(link.dstKey) // follow both directions
            if (link.direction === 'inward') {
              issue.analysis.leaf = false
              issue.analysis.orphan = false
              const edge = _.pick(link, ['srcKey', 'dstKey', 'label'])
              graph.edges.push(edge) // but only add the inward to the graph edges to make directed
              node.edges.push(edge)

              if (issue.statusCategory === 'Done' && link.dstStatusCategory !== 'Done') {
                issue.analysis.warnings.push('doneButBlocked')
              }
            }
            if (link.direction === 'outward') {
              issue.analysis.root = false
              issue.analysis.orphan = false
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
        } else {
          logger.trace(`${key}: already visited`)
        }
      }
      if (graph.nodes.length > 1) {
        graphs.push(graph)
      }
    }
  }
  return graphs
}

function analyseGraph (graph) {
  graph.analysis = {
    size: graph.nodes.length,
    acyclic: true
  }
  graph.label = _.chain(graph.nodes).filter('analysis.root').sortBy(helpers.bySortableKey).map('key').value().join('|')
  graph.nodes = _.orderBy(graph.nodes, helpers.bySortableKey)
  graph.edges = _.orderBy(graph.edges, helpers.bySortableLinkKeys)

  toposort(graph)

  if (graph.analysis.acyclic) {
    score(graph)
  }
}

function toposort (graph) {
  const edges = _.groupBy(graph.edges, 'srcKey')
  const unmarkedNodes = _.keyBy(graph.nodes, 'key')
  const temporaryMarkedNodes = {}
  const sortedNodes = []

  const visit = (key) => {
    logger.trace(`${key} - visiting`)
    if (temporaryMarkedNodes[key]) {
      graph.analysis.acyclic = false
      logger.trace(`${key} - cycle detected!!!`)
      return false
    }
    const node = unmarkedNodes[key]
    if (node) {
      logger.trace(`${key} - marking node`)
      temporaryMarkedNodes[node.key] = node
      // iterate over links
      const acyclic = _.every(edges[node.key] || [], (edge) => {
        logger.trace(`${edge.srcKey} ${edge.label} ${edge.dstKey} - reviewing`)
        return visit(edge.dstKey)
      })
      if (!acyclic) {
        return false
      }

      delete unmarkedNodes[node.key]
      delete temporaryMarkedNodes[node.key]
      sortedNodes.unshift(node)
      logger.trace(`${key} - sorted node - [${_.map(sortedNodes, 'key').join(',')}]`)
    }
    return true
  }

  while (Object.keys(unmarkedNodes).length > 0 && graph.analysis.acyclic) {
    logger.trace(`${Object.keys(unmarkedNodes).length} - unhandled nodes`)
    visit(Object.keys(unmarkedNodes)[0])
  }

  graph.nodes = sortedNodes
}

function score (graph) {
  const edgesBySrcKey = _.groupBy(graph.edges, 'srcKey')
  const edgesByDstKey = _.groupBy(graph.edges, 'dstKey')
  const nodesByKey = _.keyBy(graph.nodes, 'key')

  const size = (key) => {
    const node = nodesByKey[key]
    node.analysis.size = node.analysis.size || 1
  }

  const cumulativeSize = (key) => {
    const node = nodesByKey[key]
    if (!node.analysis.cumulativeSize) {
      node.analysis.cumulativeSize = node.analysis.size
      if (!node.analysis.leaf) {
        edgesBySrcKey[key].forEach((edge) => {
          cumulativeSize(edge.dstKey)
          node.analysis.cumulativeSize += nodesByKey[edge.dstKey].analysis.cumulativeSize
        })
      }
    }
  }

  const unlockSize = (key) => {
    const node = nodesByKey[key]
    if (!node.analysis.unlockSize) {
      node.analysis.unlockSize = node.analysis.size
      if (!node.analysis.root) {
        edgesByDstKey[key].forEach((edge) => {
          unlockSize(edge.srcKey)
          node.analysis.unlockSize += nodesByKey[edge.srcKey].analysis.unlockSize
        })
      }
    }
  }

  const scoreSize = (key) => {
    const node = nodesByKey[key]
    node.analysis.scoreSize = node.analysis.cumulativeSize * node.analysis.unlockSize
  }

  _.forEach(graph.nodes, (node) => { size(node.key) })
  _.filter(graph.nodes, 'analysis.root').forEach((root) => { cumulativeSize(root.key) })
  _.filter(graph.nodes, 'analysis.leaf').forEach((leaf) => { unlockSize(leaf.key) })
  _.forEach(graph.nodes, (node) => { scoreSize(node.key) })
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
 * @property {Object[]} issues - all significant issues
 * @property {Object[]} graphs - array of distinct graphs containing 'nodes' and 'edges'
 * @property {Object[]} graphs.nodes - array of nodes in the graph, each element being an issue
 * @property {Object[]} graphs.edges - array of edges in the graph, each element being a link
 */
class Jirascope {
  constructor (jiraClient, dataStore, options) {
    this.jiraClient = jiraClient
    this.dataStore = dataStore
    this.options = options
    this.issues = []
    this.graphs = []
  }

  /**
   * Either reads or fetches issues, tidies, and analyses
   */
  async populate () {
    if (this.dataStore) {
      this.issues = await this.dataStore.readData('issues')
    }
    if (!this.issues) {
      await this.fetch()
    }
    this.tidy()
    this.analyse()
  }

  /**
   * Fetches issues from jira
   */
  async fetch () {
    const issuesByKey = {}
    logger.info(`fetching initial issues`)
    let newIssues = await this.jiraClient.getIssuesByQuery(this.options.query, 1000)
    newIssues.forEach((newIssue) => { issuesByKey[newIssue.key] = newIssue }) // initial issues we always keep

    while (newIssues.length > 0) {
      const { unvisitedIssueKeys, epicIssues } = processNewIssues.call(this, issuesByKey, newIssues)
      newIssues = await fetchNewIssues.call(this, unvisitedIssueKeys, epicIssues)
    }
    this.issues = Object.values(issuesByKey)
  }

  /**
   * Tidies up issues, such as pruning partial links and sorting by key numeric part
   */
  tidy () {
    const allIssuesByKey = _.keyBy(this.issues, 'key')
    // prune any partial links now we have fetched everything
    _.forEach(this.issues, (issue) => {
      issue.links = _.filter(issue.links, (link) => {
        return allIssuesByKey[link.srcKey] && allIssuesByKey[link.dstKey] // only include edges that we have issues for
      })
      issue.links = _.orderBy(issue.links, helpers.bySortableLinkKeys)
    })
    this.issues = _.orderBy(this.issues, helpers.bySortableKey)
  }

  /**
   * Analyses issues previously read or fetched and tidied
   */
  analyse () {
    const graphs = determineGraphs.call(this)
    graphs.forEach((graph) => { analyseGraph.call(this, graph) })
    this.graphs = _.orderBy(graphs, ['analysis.size'], ['desc'])
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

  get warningTypes () {
    return warningTypes
  }

  get helpers () {
    return helpers
  }
}

const warningTypes = {
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

const helpers = {
  sortableKey: (key) => { return [_.split(key, '-')[0], _.padStart(_.split(key, '-')[1], 10, '0')].join('-') },
  bySortableKey: (x) => { return helpers.sortableKey(x.key) },
  bySortableLinkKeys: (x) => { return `${helpers.sortableKey(x.srcKey)}-${helpers.sortableKey(x.dstKey)}` },
  hasWarnings: (x) => { return x.analysis.warnings.length > 0 },
  isAllowedProjectKey: (key, allowedProjectKeys) => {
    if (allowedProjectKeys.length === 0) {
      return true
    }
    return _.some(allowedProjectKeys, (allowedProjectKey) => { return _.startsWith(key, allowedProjectKey) })
  }
}

Jirascope.helpers = helpers
Jirascope.warningTypes = warningTypes

exports = module.exports = Jirascope
