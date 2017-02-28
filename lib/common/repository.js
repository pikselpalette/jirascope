'use strict'

const Path = require('path')

const JiraClient = require('../common/jiraClient')
const FileStore = require('../common/fileStore')

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
    ret.type = link.type.name
    ret.direction = 'inward'
    ret.desc = link.type.inward
    ret.key = link.inwardIssue.key
  }
  if (link.outwardIssue) {
    ret.type = link.type.name
    ret.direction = 'outward'
    ret.desc = link.type.outward
    ret.key = link.outwardIssue.key
  }
  return ret
}

async function fetchIssues (jiraClient, jql, maxResults = 100) {
  async function innerFetchIssues (issues, startAt) {
    const res = await jiraClient.search(jql, startAt, maxResults)
    issues = res.issues.reduce((acc, cur) => {
      acc[cur.key] = mapIssue(cur)
      return acc
    }, issues)
    if (res.startAt + res.maxResults < res.total) {
      // retrieves the next page with a recursive call
      return innerFetchIssues(issues, res.startAt + res.maxResults)
    } else {
      return issues
    }
  }

  return innerFetchIssues({}, 0)
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
