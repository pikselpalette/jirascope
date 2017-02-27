'use strict'

async function run (config) {
  const list = await config.jira.search(config.jql)
  config.logger.success(JSON.stringify(list, null, 2))
  return Promise.resolve(undefined)
}

exports = module.exports = {
  run
}
