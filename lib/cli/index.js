'use strict'

const Rc = require('rc')
const UpdateNotifier = require('update-notifier')

const pkg = require('./../../package.json')
const prog = require('caporal')
const winston = require('winston')

const notifier = UpdateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 // daily
})
notifier.notify()

const appName = 'jirascope'
const defaultConfig = {
  appName,
  path: './',
  output: './output',
  trace: false,
  verbose: true,
  epicKeyCustomField: false,
  followStatusCategories: ['To Do', 'In Progress'], // Done
  followLinkTypes: ['Blocks', 'Epic'],
  allowedRootIssueTypes: ['Requirement', 'Initiative', 'Milestone', 'Bug'],
  allowedIssueKeyPrefixes: []
}

const logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({
      colorize: true,
      handleExceptions: true
    })
  ],
  exitOnError: false
})

async function run () {
  const config = Rc(appName, defaultConfig, {})

  prog.logger(logger)

  prog.version(pkg.version)

  require('./config').define(prog, config)
  require('./cleanup').define(prog, config)

  prog.parse(process.argv)
}

exports = module.exports = {
  run
}
