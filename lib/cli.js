'use strict'

const Rc = require('rc')
const Meow = require('meow')
const UpdateNotifier = require('update-notifier')

const Logger = require('./common/logger')
const Tasks = require('./tasks')

const pkg = require('./../package.json')

const notifier = UpdateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 // daily
})
notifier.notify()

const run = function (appName) {
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
      extract            extracts data from jira

    Options:
      -u, --username          username of jira user
      -p, --password          password of jira user

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
      t: 'trace',
      u: 'username',
      v: 'verbose'
    }
  })

  const config = Rc(appName, defaultConfig, cli.flags)

  const taskName = cli.input.shift()

  if (!Tasks[taskName]) {
    new Logger(config).error('  invalid command')
    cli.showHelp(2)
  } else {
    // TODO
  }
}

exports = module.exports = {
  run
}
