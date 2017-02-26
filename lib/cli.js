'use strict'

const Rc = require('rc')
const Meow = require('meow')
const UpdateNotifier = require('update-notifier')

const Jira = require('./common/jira')
const Logger = require('./common/logger')
const Tasks = require('./tasks')

const pkg = require('./../package.json')

const notifier = UpdateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 // daily
})
notifier.notify()

async function run (appName) {
  const defaultConfig = {
    appName: appName,
    path: '.',
    trace: false,
    verbose: true
  }

  const cli = Meow(`
    Usage:
      ${appName} <command> [tags]

    Commands:
      test               tests config
      extract            extracts data from jira

    Options:
      -u, --username          username of jira user
      -p, --password          password of jira user
      -s, --server            jira server base url

      -h, --help              display help
      -v, --verbose           verbose output, defaults to ${defaultConfig.verbose}
      -t, --trace             trace output, defaults to ${defaultConfig.trace}
          --version           output version

    Examples:
      ${appName} extract
  `, {
    alias: {
      h: 'help',
      p: 'password',
      s: 'server',
      t: 'trace',
      u: 'username',
      v: 'verbose'
    }
  })

  const config = Rc(appName, defaultConfig, cli.flags)
  const logger = config.logger = new Logger(config)
  config.jira = new Jira(config)

  const taskName = cli.input.shift()

  if (!Tasks[taskName]) {
    logger.error('  invalid command')
    cli.showHelp(2)
  } else {
    const task = Tasks[taskName]
    try {
      await task.run(config)
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
