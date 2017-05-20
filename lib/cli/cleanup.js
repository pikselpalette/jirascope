'use strict'

const Fsp = require('fs-promise')
const Path = require('path')

const Jirascope = require('..')
const JiraClient = require('../common/jiraClient')
const FileDataStore = require('../common/fileDataStore')

const winston = require('winston')

const commandName = 'cleanup'

const define = function (prog, config) {
  prog.command(commandName)
    .description('Cleanup local data')
    .action(function (args, options) {
      run(this, args, options, config)
    })

  winston.loggers.add(commandName, {
    console: {
      colorize: true,
      label: commandName
    }
  })
}

const run = async function (command, args, options, config) {
  const logger = winston.loggers.get(commandName)

  const outputDir = Path.resolve(config.path, 'output')

  const jiraClient = new JiraClient(config.server, config.username, config.password, {
    epicKeyCustomField: config.epicKeyCustomField
  })
  let dataStore
  if (config.path) {
    dataStore = new FileDataStore(Path.join(Path.dirname(config.config), config.path))
  }

  const jirascope = new Jirascope(jiraClient, dataStore, {
    query: config.query,
    followStatusCategories: config.followStatusCategories,
    followLinkTypes: config.followLinkTypes,
    allowedRootIssueTypes: config.allowedRootIssueTypes,
    allowedIssueKeyPrefixes: config.allowedIssueKeyPrefixes
  })

  await jirascope.cleanup()
  await Fsp.remove(outputDir)
  logger.info(`cleaned up`)
}

exports = module.exports = {
  define
}
