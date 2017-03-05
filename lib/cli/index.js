'use strict'

const Fs = require('fs')
const Rc = require('rc')
const Path = require('path')
const Meow = require('meow')
const UpdateNotifier = require('update-notifier')

const Jirascope = require('..')
const JiraClient = require('../common/jiraClient')
const FileStore = require('../common/fileStore')
const Logger = require('../util/logger')

const pkg = require('./../../package.json')

const notifier = UpdateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 // daily
})
notifier.notify()

const commands = {}
Fs.readdirSync(__dirname).forEach((file) => {
  if (file !== 'index.js') {
    var name = file.replace('.js', '')
    commands[name] = require('./' + name)
  }
})

async function run (appName) {
  const defaultConfig = {
    appName: appName,
    path: './',
    trace: false,
    verbose: true,
    followStatusCategories: ['To Do', 'In Progress'], // Done
    followLinkTypes: ['Blocks']
  }

  const cli = Meow(`
    Usage:
      ${appName} <command>

    Commands:
      analyse                      analyse data from jira, using local data if available
      visualise                    visualise data from jira, using local data if available
      doc                          dot notation dependency graph
      orphaned                     list orphan issues, i.e. those with no links

      extract                      extracts data from jira, storing it locally for other commands to use
      cleanup                      cleanup local data

      config                       outputs config - useful for checking setup

    Options:
      -u, --username               username of jira user
      -p, --password               password of jira user
      -s, --server                 jira server base url

      -q, --query                  jira jql query to use
      -k, --key                    jira issue key to use

          --path                   path to local data store, defaults to ${defaultConfig.path}
          --no-path                no local data store

      -h, --help                   display help
      -v, --verbose                verbose output, defaults to ${defaultConfig.verbose}
      -t, --trace                  trace output, defaults to ${defaultConfig.trace}
          --version                output version

    Examples:
      ${appName} extract
  `, {
    alias: {
      h: 'help',
      k: 'key',
      p: 'password',
      q: 'query',
      s: 'server',
      t: 'trace',
      u: 'username',
      v: 'verbose'
    }
  })

  const config = Rc(appName, defaultConfig, cli.flags)

  const logger = Logger.global
  logger.prefix = config.appName
  logger.verboseEnabled = config.verbose
  logger.traceEnabled = config.trace

  const commandName = cli.input.shift()

  const jiraClient = new JiraClient(config.server, config.username, config.password)
  let dataStore
  if (config.path) {
    dataStore = new FileStore(Path.join(Path.dirname(config.config), config.path))
  }

  const jirascope = new Jirascope(jiraClient, dataStore, {
    query: config.query,
    followStatusCategories: config.followStatusCategories,
    followLinkTypes: config.followLinkTypes
  })

  if (!commands[commandName]) {
    logger.error('  invalid command')
    cli.showHelp(2)
  } else {
    const command = new commands[commandName](config, jirascope)
    try {
      await command.run()
      process.exit(0)
    } catch (err) {
      logger.error(err)
      process.exit(1)
    }
  }
}

exports = module.exports = {
  run
}
