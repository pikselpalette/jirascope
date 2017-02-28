'use strict'

const Path = require('path')

const JiraClient = require('../common/jiraClient')
const FileStore = require('../common/fileStore')

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
  async function innerFetchIssues (startAt) {
    const res = await jiraClient.search(jql, startAt, maxResults)
    res.issues.forEach((cur) => {
      issues[cur.key] = mapIssue(cur)
    })
    if (res.startAt + res.maxResults < res.total) {
      await innerFetchIssues(res.startAt + res.maxResults)
    }
  }
  await innerFetchIssues(0)

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
