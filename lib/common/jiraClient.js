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
    Logger.global.info(`calling search for '${jql}' starting at index ${startAt}`)
    return Fetch(url, Object.assign({}, this.defaults, {})).then((response) => {
      if (!response.ok) {
        const error = new Error(response.statusText)
        error.response = response
        throw error
      }
      return response.json()
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
      return response.json()
    })
  }
}

exports = module.exports = JiraClient
