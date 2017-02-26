'use strict'

async function run (config) {
  const response = await config.jira.search('project = PVP')
  config.logger.success(response)
  return Promise.resolve(undefined)
}

exports = module.exports = {
  run
}
