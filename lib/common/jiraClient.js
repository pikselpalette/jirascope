'use strict'

const Fetch = require('node-fetch')
const Qs = require('qs')
const _ = require('lodash')

const Logger = require('../util/logger')
const logger = Logger.global.chain('[jira]')

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
    logger.info(`calling search for '${jql}' for index ${startAt} to ${startAt + maxResults - 1}`)
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

  async getIssuesByQuery (jql, startAt = 0, maxResults = 50) {
    let issues = []
    let res
    do {
      res = await this.search(jql, startAt, maxResults)
      issues.push(...res.issues)
      startAt = res.startAt + res.maxResults
    } while (res.startAt + res.maxResults < res.total)
    return issues
  }

  async getIssuesByKey (keys, startAt = 0, maxResults = 50) {
    const chunks = _.chunk(keys, maxResults)
    const requests = chunks.map((chunk) => {
      return this.search(`issue in (${chunk.join(',')})`, startAt, maxResults)
    })
    const issues = []
    for (let request of requests) {
      issues.push(...(await request).issues)
    }
    return issues
  }
}

exports = module.exports = JiraClient
