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
  fetchWithDefaults (url, options = {}) {
    const opts = Object.assign({}, this.defaults, options)
    return Fetch(url, opts).then((response) => {
      if (!response.ok) {
        const error = new Error(response.statusText)
        error.response = response
        throw error
      }
      if (response.status === 204) {
        return Promise.resolve({})
      }
      return response.json()
    })
  }
  search (jql) {
    const startAt = 0
    const maxResults = 1000
    const qs = Qs.stringify({
      jql,
      startAt,
      maxResults
    })
    return this.fetchWithDefaults(`${this.config.server}rest/api/2/search?${qs}`)
  }
  getIssue (id) {
    return Promise.resolve({})
  }
}

exports = module.exports = Jira
