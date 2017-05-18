'use strict'

const Rc = require('rc')
const UpdateNotifier = require('update-notifier')

const pkg = require('./../../package.json')
const prog = require('caporal')

const notifier = UpdateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 // daily
})
notifier.notify()

async function run (appName) {
  const defaultConfig = {
    appName: appName,
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

  const config = Rc(appName, defaultConfig)

  prog.version(pkg.version)

  new (require('./config'))().define(prog, config)

  prog.parse(process.argv)
}

exports = module.exports = {
  run
}
