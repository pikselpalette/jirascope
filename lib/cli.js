'use strict'

const Rc = require('rc')
const Meow = require('meow')
const UpdateNotifier = require('update-notifier')

const Logger = require('./util/logger')
const Commands = require('./commands')

const pkg = require('./../package.json')

const notifier = UpdateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 // daily
})
notifier.notify()

async function run (appName) {
  const defaultConfig = {
    appName: appName,
    path: './data',
    trace: false,
    verbose: true,
    followDone: false
  }

  const cli = Meow(`
    Usage:
      ${appName} <command>

    Commands:
      analyse                      analyse data from jira, using local data if available
      visualise                    visualise data from jira, using local data if available

      extract                      extracts data from jira, storing it locally for other commands to use
      cleanup                      cleanup local data

      config                       outputs config - useful for checking setup

    Options:
      -u, --username               username of jira user
      -p, --password               password of jira user
      -s, --server                 jira server base url

      -q, --query                  jira jql query to use
      -k, --key                    jira issue key to use

          --follow-done            follow links from done issues, defaults to ${defaultConfig.followDone}

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

  if (!Commands[commandName]) {
    logger.error('  invalid command')
    cli.showHelp(2)
  } else {
    const command = new Commands[commandName](config)
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
