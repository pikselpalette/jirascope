'use strict'

const Fetch = require('node-fetch')
const Qs = require('qs')

class Jira {
  constructor (config) {
    this.config = config
    this.defaults = {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Authorization': 'Basic ' + new Buffer(`${config.username}:${config.password}`).toString('base64'),
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
  search (jql) {
    const startAt = 0
    const maxResults = 1000
    const qs = Qs.stringify({
      jql,
      startAt,
      maxResults,
      fields: this.config.issueFields.join(',')
    })
    const url = `${this.config.server}rest/api/2/search?${qs}`
    const opts = Object.assign({}, this.defaults, {})
    return Fetch(url, opts).then((response) => {
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
      fields: this.config.issueFields.join(',')
    })
    const url = `${this.config.server}rest/api/2/issue/${key}?${qs}`
    const opts = Object.assign({}, this.defaults, {})
    return Fetch(url, opts).then((response) => {
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

exports = module.exports = Jira
