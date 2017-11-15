'use strict'

const Fs = require('fs')
const Rc = require('rc')
const Path = require('path')
const Meow = require('meow')
const UpdateNotifier = require('update-notifier')

const Jirascope = require('..')
const JiraClient = require('../common/jiraClient')
const FileDataStore = require('../common/fileDataStore')
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
    output: './output',
    trace: false,
    verbose: true,
    epicKeyCustomField: false,
    epicIssueTypes: ['Epic'],
    parentKeyCustomField: false,
    parentIssueTypes: ['Initiative'],
    followStatusCategories: ['To Do', 'In Progress'], // Done
    followLinkTypes: ['Blocks', 'Epic', 'Parent'],
    allowedGraphIssueTypes: ['Initiative'],
    allowedRootIssueTypes: ['Initiative', 'Requirement', 'Bug'],
    allowedIssueKeyPrefixes: [],
    trackedIssueLabels: []
  }

  const cli = Meow(`
    Usage:
      ${appName} <command> [prefixA] [prefixB]

    Commands:
      config                       outputs config - useful for checking setup
      cleanup                      cleanup local data
      extract                      extracts data from jira, storing it locally for other commands to use
                                   optional prefixes are used to limit the extent of spidering of linked issues

      analyse                      analyse data from jira
      dot                          dot notation dependency graph
      dots                         dot notation dependency subgraphs
      list                         output issues
      highest                      output top 10% highest scoring tickets
      roots                        output root issues
      trackers                     output tracker issues
      warnings                     output issues with warnings
      focus                        opens the top 10 warning issues in your browser
      cycles                       output graph cycles


    Options:
      -u, --username               username of jira user
      -p, --password               password of jira user
      -s, --server                 jira server base url
      -q, --query                  jira jql query to use

          --path                   path to local data store, defaults to ${defaultConfig.path}
          --no-path                no local data store

          --output                 path to output, defaults to ${defaultConfig.output}

      -h, --help                   display help
      -v, --verbose                verbose output, defaults to ${defaultConfig.verbose}
      -t, --trace                  trace output, defaults to ${defaultConfig.trace}
          --version                output version

    Examples:
      ${appName} extract           extract issues from the initial query and all linked issues
      ${appName} extract ACME      extract issues from the initial query and all ACME prefixed linked issues
  `, {
    alias: {
      h: 'help',
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
  config.allowedIssueKeyPrefixes = config.allowedIssueKeyPrefixes.concat(cli.input)

  const jiraClient = new JiraClient(config.server, config.username, config.password, {
    epicKeyCustomField: config.epicKeyCustomField,
    parentKeyCustomField: config.parentKeyCustomField
  })
  let dataStore
  if (config.path) {
    dataStore = new FileDataStore(Path.join(Path.dirname(config.config), config.path))
  }

  const jirascope = new Jirascope(jiraClient, dataStore, {
    query: config.query,
    epicIssueTypes: config.epicIssueTypes,
    parentIssueTypes: config.parentIssueTypes,
    followStatusCategories: config.followStatusCategories,
    followLinkTypes: config.followLinkTypes,
    allowedRootIssueTypes: config.allowedRootIssueTypes,
    allowedIssueKeyPrefixes: config.allowedIssueKeyPrefixes,
    allowedGraphIssueTypes: config.allowedGraphIssueTypes,
    trackedIssueLabels: config.trackedIssueLabels
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
