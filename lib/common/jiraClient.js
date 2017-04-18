'use strict'

const Fetch = require('node-fetch')
const Qs = require('qs')
const _ = require('lodash')

const Logger = require('../util/logger')
const logger = Logger.global.chain('[jira]')

function queryFields (epicKeyCustomField) {
  const fields = [
    'key',
    'issuetype',
    'summary',
    'project',
    'priority',
    'status',
    'labels',
    'issuelinks',
    'updated'
  ]
  if (epicKeyCustomField) {
    fields.push(epicKeyCustomField)
  }
  return fields.join(',')
}

function convertIssue (rawIssue, epicKeyCustomField) {
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
      if (rawLink.inwardIssue) {
        issue.links.push({
          type: rawLink.type.name,
          direction: 'inward',
          srcKey: rawIssue.key,
          label: rawLink.type.inward,
          dstKey: rawLink.inwardIssue.key,
          dstStatus: rawLink.inwardIssue.fields.status.name,
          dstStatusCategory: rawLink.inwardIssue.fields.status.statusCategory.name
        })
      }
      if (rawLink.outwardIssue) {
        issue.links.push({
          type: rawLink.type.name,
          direction: 'outward',
          srcKey: rawIssue.key,
          label: rawLink.type.outward,
          dstKey: rawLink.outwardIssue.key,
          dstStatus: rawLink.outwardIssue.fields.status.name,
          dstStatusCategory: rawLink.outwardIssue.fields.status.statusCategory.name
        })
      }
    })
  }
  if (epicKeyCustomField && rawIssue.fields[epicKeyCustomField]) {
    issue.epicKey = rawIssue.fields[epicKeyCustomField]
  }
  return issue
}

/**
 * Provides a lightweght client SDK for the JIRA REST API.
 *
 * @param {string} server - The base url for the jira server
 * @param {string} username - The username to authenticate with
 * @param {string} password - The password to authenticate with
 * @param {Object} options - Options to customise behaviour
 * @param {string} options.epicKeyCustomField - The custom field used for epic keys
 *
 * @property {Object} defaults - default passed to fetch when making http invocations
 */
class JiraClient {
  constructor (server, username, password, options) {
    this.server = server
    this.options = options
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
   * Pass a search query to Jira.  See [Jira Doc](https://docs.atlassian.com/jira/REST/cloud/#api/2/search-search)
   * for details.
   *
   * @param {string} jql - jira query string in JQL
   * @param {number?} startAt - index to start at (zero based)
   * @param {number?} maxResults - maximum results to return
   *
   * @returns {Promise.<Object>} - A promise containing the response of the request
   */
  search (jql, startAt = 0, maxResults = 50) {
    const qs = Qs.stringify({
      jql,
      startAt,
      maxResults,
      fields: queryFields(this.options.epicKeyCustomField)
    })
    const url = `${this.server}rest/api/2/search?${qs}`
    const fetchOptions = Object.assign({}, this.defaults, {})
    logger.info(`calling search for '${jql}' for index ${startAt} to ${startAt + maxResults - 1}`)
    return Fetch(url, fetchOptions).then((response) => {
      if (!response.ok) {
        const error = new Error(response.statusText)
        error.response = response
        throw error
      }
      return response.json().then((res) => {
        res.issues = res.issues.map((issue) => {
          return convertIssue(issue, this.options.epicKeyCustomField)
        })
        return res
      })
    })
  }

  /**
   * Gets issues using the supplied JQL and fully paginates to return all issues.
   *
   * @param {string} jql - jira query string in JQL
   * @param {number?} pageSize - page size for pagination requests
   *
   * @see {@link JiraClient#search}
   *
   * @returns {Promise.<Object[]>} - A promise for the list of issues matching the query
   */
  async getIssuesByQuery (jql, pageSize = 50) {
    let issues = []
    let startAt = 0
    let res
    do {
      res = await this.search(jql, startAt, pageSize)
      issues.push(...res.issues)
      startAt = res.startAt + res.maxResults
    } while (res.startAt + res.maxResults < res.total)
    return issues
  }

  /**
   * Gets issues using the supplied keys, splitting the requests to handle the maxChunkSize
   *
   * @param {string[]} keys - jira issue keys
   * @param {number?} maxChunkSize - maximum keys per request
   *
   * @see {@link JiraClient#search}
   *
   * @returns {Promise.<Object[]>} - A promise for the list of issues matching the keys
   */
  async getIssuesByKey (keys, maxChunkSize = 50) {
    const chunks = _.chunk(keys, maxChunkSize)
    const requests = chunks.map((chunk) => {
      return this.search(`issue in (${chunk.join(',')})`, 0, maxChunkSize)
    })
    const issues = []
    for (let request of requests) {
      issues.push(...(await request).issues)
    }
    return issues
  }

  /**
   * Gets issues using the supplied epic keys, splitting the requests to handle the maxChunkSize for epic keys
   *
   * @param {string[]} keys - jira issue keys
   * @param {number?} maxChunkSize - maximum keys per request
   * @param {number?} pageSize - page size for pagination requests
   *
   * @see {@link JiraClient#search}
   *
   * @returns {Promise.<Object[]>} - A promise for the list of issues matching the keys
   */
  async getIssuesByEpicKey (keys, maxChunkSize = 10, pageSize = 1000) {
    const chunks = _.chunk(keys, maxChunkSize)
    const requests = chunks.map((chunk) => {
      return this.getIssuesByQuery(`"Epic Link" in (${chunk.join(',')})`, pageSize)
    })
    const issues = []
    for (let request of requests) {
      issues.push(...(await request))
    }
    return issues
  }
}

exports = module.exports = JiraClient
