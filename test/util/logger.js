'use strict'

const test = require('ava').test

const Logger = require('../../lib/util/logger')
const Chalk = require('chalk')

const message = `test`

const stubLogFn = function (...args) {
  return args.join(' ')
}

test('default handling', t => {
  const logger = new Logger()
  logger.logFn = stubLogFn
  t.plan(5)
  t.is(logger.trace(message), undefined)
  t.is(logger.info(message), `${Chalk.cyan('[INFO ]')} test`)
  t.is(logger.warn(message), `${Chalk.yellow('[WARN ]')} test`)
  t.is(logger.error(message), `${Chalk.red('[ERROR]')} test`)
  t.is(logger.success(message), `${Chalk.green('[DONE ]')} test`)
})

test('trace enabled', t => {
  const logger = new Logger()
  logger.logFn = stubLogFn
  logger.traceEnabled = true
  t.plan(5)
  t.is(logger.trace(message), `${Chalk.gray('[TRACE]')} test`)
  t.is(logger.info(message), `${Chalk.cyan('[INFO ]')} test`)
  t.is(logger.warn(message), `${Chalk.yellow('[WARN ]')} test`)
  t.is(logger.error(message), `${Chalk.red('[ERROR]')} test`)
  t.is(logger.success(message), `${Chalk.green('[DONE ]')} test`)
})

test('verbose disabled', t => {
  const logger = new Logger()
  logger.logFn = stubLogFn
  logger.verboseEnabled = false
  t.plan(5)
  t.is(logger.trace(message), undefined)
  t.is(logger.info(message), undefined)
  t.is(logger.warn(message), `${Chalk.yellow('[WARN ]')} test`)
  t.is(logger.error(message), `${Chalk.red('[ERROR]')} test`)
  t.is(logger.success(message), `${Chalk.green('[DONE ]')} test`)
})

test('trace enabled, verbose disabled', t => {
  const logger = new Logger()
  logger.logFn = stubLogFn
  logger.traceEnabled = true
  logger.verboseEnabled = false
  t.plan(5)
  t.is(logger.trace(message), `${Chalk.gray('[TRACE]')} test`)
  t.is(logger.info(message), `${Chalk.cyan('[INFO ]')} test`)
  t.is(logger.warn(message), `${Chalk.yellow('[WARN ]')} test`)
  t.is(logger.error(message), `${Chalk.red('[ERROR]')} test`)
  t.is(logger.success(message), `${Chalk.green('[DONE ]')} test`)
})

test('all enabled, chain set', t => {
  let logger = new Logger()
  logger.logFn = stubLogFn
  logger.traceEnabled = true
  logger.verboseEnabled = true
  logger = logger.chain('[prefix]')
  t.plan(5)
  t.is(logger.trace(message), `${Chalk.gray('[TRACE]')} [prefix] test`)
  t.is(logger.info(message), `${Chalk.cyan('[INFO ]')} [prefix] test`)
  t.is(logger.warn(message), `${Chalk.yellow('[WARN ]')} [prefix] test`)
  t.is(logger.error(message), `${Chalk.red('[ERROR]')} [prefix] test`)
  t.is(logger.success(message), `${Chalk.green('[DONE ]')} [prefix] test`)
})
