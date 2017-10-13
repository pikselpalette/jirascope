'use strict'

const _ = require('lodash')

const Logger = require('./util/logger')
const logger = Logger.global.chain('[jirascope]')

function populateFakeEpicLinks (epicIssues, childIssues) {
  childIssues.forEach((childIssue) => {
    const epicIssue = epicIssues[childIssue.epicKey]
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
    if (!helpers.isAllowedIssueKeyPrefix(newIssue.key, this.options.allowedIssueKeyPrefixes)) {
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

    // lets keep it
    if (issuesByKey[newIssue.key]) { // if exists, merge in links
      issuesByKey[newIssue.key].links = _.chain(issuesByKey[newIssue.key].links).concat(newIssue.links).uniqBy('dstKey').value()
    } else {
      issuesByKey[newIssue.key] = newIssue
    }

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
  const unvisitedIssueKeys = _.sortBy(Object.keys(unvisitedIssues), helpers.sortableKey)
  return {unvisitedIssueKeys, epicIssues}
}

async function fetchNewIssues (unvisitedIssueKeys, epicIssues) {
  let newIssues = []
  if (unvisitedIssueKeys.length > 0) {
    logger.info(`fetching unvisited linked issues`)
    const unvisitedLinkedIssues = await this.jiraClient.getIssuesByKey(unvisitedIssueKeys)
    newIssues = newIssues.concat(unvisitedLinkedIssues)
    logger.trace(`found ${Object.keys(unvisitedLinkedIssues).length} unvisited linked issues`)
  }

  const unseenEpicIssueKeys = Object.keys(epicIssues)
  if (unseenEpicIssueKeys.length > 0) {
    logger.info(`fetching unseen epic child issues`)
    const childIssues = await this.jiraClient.getIssuesByEpicKey(unseenEpicIssueKeys)
    logger.trace(`found ${Object.keys(childIssues).length} epic child issues`)
    newIssues = newIssues.concat(childIssues)
    populateFakeEpicLinks(epicIssues, childIssues)
  }

  return newIssues
}

function analyseIssues () {
  _.forEach(this.issues, (issue) => {
    logger.trace(`analysing issue: ${issue.key}`)

    issue.analysis = {
      root: true,
      leaf: true,
      warnings: [],
      tracker: this.options.allowedGraphIssueTypes.includes(issue.type)
    }

    issue.links.forEach((link) => {
      if (link.direction === 'inward') {
        issue.analysis.leaf = false

        if (issue.statusCategory === 'Done' && link.dstStatusCategory !== 'Done') {
          issue.analysis.warnings.push('doneButBlocked')
        }
      }
      if (link.direction === 'outward') {
        issue.analysis.root = false
      }
    })

    if (issue.analysis.root &&
        issue.analysis.leaf &&
        !this.options.allowedRootIssueTypes.includes(issue.type)) {
      if (_.intersection(this.options.trackedIssueLabels, issue.labels).length === 0) {
        issue.analysis.warnings.push('untracked')
      }
    }

    if (issue.analysis.root &&
        !issue.analysis.leaf &&
        !this.options.allowedRootIssueTypes.includes(issue.type)) {
      issue.analysis.warnings.push('invalidRoot')
    }
  })
}

function determineGraphs () {
  const graphs = []
  const issues = _.chain(this.issues).keyBy('key').value()
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
          graph.nodes.push(node)
          delete issues[key]

          issue.links.forEach((link) => {
            stack.unshift(link.dstKey) // follow both directions
            if (link.direction === 'inward') {
              const edge = _.pick(link, ['srcKey', 'dstKey', 'label'])
              graph.edges.push(edge) // but only add the inward to the graph edges to make directed
            }
          })
        } else {
          logger.trace(`${key}: already visited`)
        }
      }

      if (_.filter(graph.nodes, 'analysis.tracker').length > 0) {
        graphs.push(graph)
      } else {
        graph.nodes.forEach((node) => {
          node.analysis.warnings.push('invalidGraph')
        })
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

  toposortGraph(graph)

  if (graph.analysis.acyclic) {
    scoreGraph(graph)
  }
}

function toposortGraph (graph) {
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

const priorityScore = {
  'Highest': 5,
  'High': 3,
  'Medium': 1,
  'Low': 0,
  'Lowest': 0
}

function scoreGraph (graph) {
  const edgesBySrcKey = _.groupBy(graph.edges, 'srcKey')
  const edgesByDstKey = _.groupBy(graph.edges, 'dstKey')
  const nodesByKey = _.keyBy(graph.nodes, 'key')
  const descendents = {}
  const ancestors = {}

  const lookupNode = (key) => { return nodesByKey[key] }

  const size = (key) => {
    const node = nodesByKey[key]
    node.analysis.score = node.analysis.score || priorityScore[node.priority]
  }

  const downstreamScore = (key) => {
    const node = nodesByKey[key]
    if (!descendents[key]) {
      descendents[key] = []
      if (!node.analysis.leaf) {
        edgesBySrcKey[key].forEach((edge) => {
          downstreamScore(edge.dstKey)
          descendents[key] = _.union(descendents[key], [edge.dstKey], descendents[edge.dstKey])
        })
      }
    }
    node.analysis.downstreamScore = _.sumBy(_.map(descendents[key], lookupNode), 'analysis.score') + node.analysis.score
  }

  const upstreamScore = (key) => {
    const node = nodesByKey[key]
    if (!ancestors[key]) {
      ancestors[key] = []
      if (!node.analysis.root) {
        edgesByDstKey[key].forEach((edge) => {
          upstreamScore(edge.srcKey)
          ancestors[key] = _.union(ancestors[key], [edge.srcKey], ancestors[edge.srcKey])
        })
      }
    }
    node.analysis.upstreamScore = _.sumBy(_.map(ancestors[key], lookupNode), 'analysis.score') + node.analysis.score
  }

  const totalScore = (key) => {
    const node = nodesByKey[key]
    const leafDescendentsScore = _.chain(descendents[key]).map(lookupNode).filter('analysis.leaf').sumBy('analysis.upstreamScore').value()
    const rootAncestorsScore = _.chain(ancestors[key]).map(lookupNode).filter('analysis.root').sumBy('analysis.downstreamScore').value()

    node.analysis.totalScore = leafDescendentsScore + rootAncestorsScore + node.analysis.score
  }

  _.forEach(graph.nodes, (node) => { size(node.key) })
  _.filter(graph.nodes, 'analysis.root').forEach((root) => { downstreamScore(root.key) })
  _.filter(graph.nodes, 'analysis.leaf').forEach((leaf) => { upstreamScore(leaf.key) })
  _.forEach(graph.nodes, (node) => { totalScore(node.key) })
}

function scoreIssue (issue) {
  if (!issue.analysis.score) {
    issue.analysis.score = priorityScore[issue.priority]
    issue.analysis.upstreamScore = priorityScore[issue.priority]
    issue.analysis.downstreamScore = priorityScore[issue.priority]
    issue.analysis.totalScore = priorityScore[issue.priority]
  }
}

function determineSubgraphs () {
  const subgraphs = []
  this.graphs.forEach((parent) => {
    const edgesBySrcKey = _.groupBy(parent.edges, 'srcKey')
    const edgesByDstKey = _.groupBy(parent.edges, 'dstKey')
    const trackerNodes = _.filter(parent.nodes, 'analysis.tracker')
    trackerNodes.forEach((tracker) => {
      const nodesByKey = _.chain(parent.nodes).cloneDeep().keyBy('key').value() // this wants to be fresh for each subgraph
      const stack = [tracker.key] // seed the stack
      const subgraph = {
        label: tracker.key,
        nodes: [],
        edges: []
      }
      logger.trace(`starting a new sub graph with ${tracker.key}`)
      while (stack.length !== 0) {
        const key = stack.pop()
        const node = nodesByKey[key]
        logger.trace(`${key}: considering`)
        if (node) {
          subgraph.nodes.push(node)
          delete nodesByKey[key]

          node.analysis.entry = node.key === tracker.key
          node.analysis.exit = !node.analysis.entry && this.options.allowedGraphIssueTypes.includes(node.type)

          if (!node.analysis.leaf && !node.analysis.term) {
            edgesBySrcKey[key].forEach((edge) => {
              stack.push(edge.dstKey)
              subgraph.edges.push(edge)
            })
          }
          if (!node.analysis.root && !node.analysis.term) {
            edgesByDstKey[key].forEach((edge) => {
              stack.push(edge.srcKey)
              subgraph.edges.push(edge)
              const srcNode = nodesByKey[edge.srcKey]
              if (srcNode) {
                srcNode.analysis.term = this.options.allowedGraphIssueTypes.includes(srcNode.type)
              }
            })
          }
        } else {
          logger.trace(`${key}: already visited`)
        }
      }

      subgraph.nodes = _.orderBy(subgraph.nodes, helpers.bySortableKey)
      subgraph.edges = _.chain(subgraph.edges).uniq().orderBy(helpers.bySortableLinkKeys).value()

      subgraph.analysis = {
        size: subgraph.nodes.length,
        acyclic: true
      }

      toposortGraph(subgraph)

      subgraphs.push(subgraph)
    })
  })
  return subgraphs
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
 * @param {string[]} options.allowedGraphIssueTypes - An array of types that must be present to mark valid graphs
 * @param {string[]} options.allowedRootIssueTypes - An array of types that are allowed to mark valid root issues
 * @param {string[]} options.allowedIssueKeyPrefixes - An array of project keys that are allowed, or empty for any
 * @param {string[]} options.trackedIssueLabels - An array of labels that are allowed to mark tracked issues
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
    this.subgraphs = []
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
    analyseIssues.call(this)
    const graphs = determineGraphs.call(this)
    graphs.forEach((graph) => { analyseGraph.call(this, graph) })
    this.graphs = _.orderBy(graphs, ['analysis.size'], ['desc'])
    this.issues.forEach((issue) => { scoreIssue.call(this, issue) })
    const subgraphs = determineSubgraphs.call(this)
    this.subgraphs = _.orderBy(subgraphs, ['analysis.size'], ['desc'])
  }

  async store () {
    if (this.dataStore) {
      await this.dataStore.writeData('issues', this.issues)
      await this.dataStore.writeData('graphs', this.graphs)
      await this.dataStore.writeData('subgraphs', this.subgraphs)
    }
  }

  async cleanup () {
    this.issues = {}
    if (this.dataStore) {
      await this.dataStore.deleteData('issues')
      await this.dataStore.deleteData('graphs')
      await this.dataStore.deleteData('subgraphs')
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
  invalidGraph: {
    label: 'Invalid Graph'
  },
  untracked: {
    label: 'Untracked'
  }
}

const helpers = {
  sortableKey: (key) => { return [_.split(key, '-')[0], _.padStart(_.split(key, '-')[1], 10, '0')].join('-') },
  bySortableKey: (x) => { return helpers.sortableKey(x.key) },
  bySortableLinkKeys: (x) => { return `${helpers.sortableKey(x.srcKey)}-${helpers.sortableKey(x.dstKey)}` },
  hasWarnings: (x) => { return x.analysis.warnings.length > 0 },
  isRoot: (x) => { return x.analysis.root },
  isTracker: (x) => { return x.analysis.tracker },
  isAllowedIssueKeyPrefix: (key, allowedIssueKeyPrefixes) => {
    if (allowedIssueKeyPrefixes.length === 0) {
      return true
    }
    return _.some(allowedIssueKeyPrefixes, (allowedIssueKeyPrefix) => { return _.startsWith(key, allowedIssueKeyPrefix) })
  },
  hasAllowedIssueKeyPrefixes: (allowedIssueKeyPrefixes) => {
    return (x) => {
      return helpers.isAllowedIssueKeyPrefix(x.key, allowedIssueKeyPrefixes)
    }
  }
}

Jirascope.helpers = helpers
Jirascope.warningTypes = warningTypes

exports = module.exports = Jirascope
