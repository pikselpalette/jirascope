'use strict'

const Path = require('path')

const JiraClient = require('../common/jiraClient')
const Store = require('../common/store')

function mapIssue (issue) {
  return {
    key: issue.key,
    summary: issue.fields.summary,
    issueType: issue.fields.issuetype.name,
    project: issue.fields.project.name,
    projectKey: issue.fields.project.key,
    priority: issue.fields.priority.name,
    labels: issue.fields.labels,
    status: issue.fields.status.name,
    statusCategory: issue.fields.status.statusCategory.name,
    issueLinks: issue.fields.issuelinks.map(mapIssueLink),
    updated: issue.fields.updated
  }
}

function mapIssueLink (link) {
  let ret = {}
  if (link.inwardIssue) {
    ret.direction = 'inward'
    ret.type = link.type.inward
    ret.key = link.inwardIssue.key
  }
  if (link.outwardIssue) {
    ret.direction = 'outward'
    ret.type = link.type.outward
    ret.key = link.outwardIssue.key
  }
  return ret
}

async function fetchIssues (jiraClient, jql) {
  const list = await jiraClient.search(jql)
  let issues = list.issues.reduce((acc, cur) => {
    acc[cur.key] = mapIssue(cur)
    return acc
  }, {})
  return issues
}

class Repository {
  constructor (config) {
    this.config = config
    this.jiraClient = new JiraClient(config.server, config.username, config.password)
    this.store = new Store(config)
    this.cacheDir = Path.join(this.config.path, 'cache')
  }

  async issues () {
    const cacheFileName = Path.join(this.cacheDir, 'issues.json')
    let issues
    if (this.config.readFromCache) {
      issues = await this.store.readJSON(cacheFileName)
    }

    if (!issues) {
      issues = await fetchIssues(this.jiraClient, this.config.jql)
      if (this.config.writeToCache) {
        await this.store.writeJSON(cacheFileName, issues)
      }
    }

    return issues
  }
}

exports = module.exports = Repository
