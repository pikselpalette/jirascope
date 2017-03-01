'use strict'

const Path = require('path')

const JiraClient = require('../common/jiraClient')
const FileStore = require('../common/fileStore')

const Logger = require('../util/logger')

const linkTypes = ['Blocks', 'Relates']

function mapIssue (issue) {
  return {
    key: issue.key,
    summary: issue.fields.summary,
    type: issue.fields.issuetype.name,
    project: issue.fields.project.name,
    projectKey: issue.fields.project.key,
    priority: issue.fields.priority.name,
    labels: issue.fields.labels,
    status: issue.fields.status.name,
    statusCategory: issue.fields.status.statusCategory.name,
    links: issue.fields.issuelinks.map(mapIssueLink).filter(isDefined),
    updated: issue.fields.updated
  }
}

function isDefined (obj) {
  return !!obj
}

function mapIssueLink (link) {
  if (!linkTypes.includes(link.type.name)) {
    return
  }
  if (link.inwardIssue) {
    return {
      type: link.type.name,
      direction: 'inward',
      desc: link.type.inward,
      key: link.inwardIssue.key
    }
  }
  if (link.outwardIssue) {
    return {
      type: link.type.name,
      direction: 'outward',
      desc: link.type.outward,
      key: link.outwardIssue.key
    }
  }
}

async function fetchIssues (jiraClient, jql, maxResults = 100) {
  const issues = {}
  const lookups = []

  Logger.global.info(`fetching issues using initial query`)
  async function innerFetchIssues (startAt) {
    const res = await jiraClient.search(jql, startAt, maxResults)
    res.issues.forEach((issue) => {
      issue = mapIssue(issue)
      issues[issue.key] = issue
      Logger.global.trace(`found ${issue.key}`)
    })
    if (res.startAt + res.maxResults < res.total) {
      await innerFetchIssues(res.startAt + res.maxResults)
    }
  }
  await innerFetchIssues(0)

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
      issue = mapIssue(issue)
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
