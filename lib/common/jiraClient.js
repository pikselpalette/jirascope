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
  'Blocks'
]

function convertIssue (rawIssue) {
  const issue = {
    key: rawIssue.key,
    summary: rawIssue.fields.summary,
    type: rawIssue.fields.issuetype.name,
    project: rawIssue.fields.project.name,
    projectKey: rawIssue.fields.project.key,
    priority: rawIssue.fields.priority.name,
    labels: rawIssue.fields.labels,
    status: rawIssue.fields.status.name,
    statusCategory: rawIssue.fields.status.statusCategory.name,
    updated: rawIssue.fields.updated
  }
  issue.links = []
  if (rawIssue.fields.issuelinks) {
    rawIssue.fields.issuelinks.forEach((rawLink) => {
      if (!linkTypes.includes(rawLink.type.name)) {
        return
      }
      if (rawLink.inwardIssue) {
        issue.links.push({
          type: rawLink.type.name,
          direction: 'inward',
          srcKey: rawIssue.key,
          label: rawLink.type.inward,
          dstKey: rawLink.inwardIssue.key
        })
      }
      if (rawLink.outwardIssue) {
        issue.links.push({
          type: rawLink.type.name,
          direction: 'outward',
          srcKey: rawIssue.key,
          label: rawLink.type.outward,
          dstKey: rawLink.outwardIssue.key
        })
      }
    })
  }
  return issue
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
