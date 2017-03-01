'use strict'

const Fetch = require('node-fetch')
const Qs = require('qs')

const Logger = require('../util/logger')

const queryFields = [
  'key',
  'issuetype',
  'summary',
  'project',
  'priority',
  'status',
  'labels',
  'issuelinks',
  'updated'
].join(',')

const linkTypes = [
  'Blocks',
  'Relates'
]

function convertIssue (issue) {
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
    links: issue.fields.issuelinks.map(convertIssueLink).filter(isDefined),
    updated: issue.fields.updated
  }
}

function isDefined (obj) {
  return !!obj
}

function convertIssueLink (link) {
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

class JiraClient {
  constructor (server, username, password) {
    this.server = server
    this.defaults = {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Authorization': 'Basic ' + new Buffer(`${username}:${password}`).toString('base64'),
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }
  }

  /**
   * Pass a search query to Jira
   * [Jira Doc](https://docs.atlassian.com/jira/REST/cloud/#api/2/search-search)
   * @name search
   * @function
   * @param {string} jql - jira query string in JQL
   */
  search (jql, startAt = 0, maxResults = 50) {
    const qs = Qs.stringify({
      jql,
      startAt,
      maxResults,
      fields: queryFields
    })
    const url = `${this.server}rest/api/2/search?${qs}`
    Logger.global.info(`calling search for '${jql}' for index ${startAt} to ${startAt + maxResults - 1}`)
    return Fetch(url, Object.assign({}, this.defaults, {})).then((response) => {
      if (!response.ok) {
        const error = new Error(response.statusText)
        error.response = response
        throw error
      }
      return response.json().then((res) => {
        res.issues = res.issues.map((issue) => {
          return convertIssue(issue)
        })
        return res
      })
    })
  }

  /**
   * Gets an issue in jira, or returns undefine
   * @name getIssue
   * @function
   * [Jira Doc](https://docs.atlassian.com/jira/REST/cloud/#api/2/issue-getIssue)
   * @param {string} key - The issue key (including the project key prefix)
   */
  getIssue (key) {
    const qs = Qs.stringify({
      fields: queryFields
    })
    const url = `${this.server}rest/api/2/issue/${key}?${qs}`
    Logger.global.info(`calling get issue for '${key}'`)
    return Fetch(url, Object.assign({}, this.defaults, {})).then((response) => {
      if (response.status === 404) {
        return Promise.resolve(undefined)
      }
      if (!response.ok) {
        const error = new Error(response.statusText)
        error.response = response
        throw error
      }
      return response.json().then((issue) => {
        return convertIssue(issue)
      })
    })
  }
}

exports = module.exports = JiraClient
