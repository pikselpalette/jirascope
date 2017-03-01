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
  t.is(logger.info(message), `test`)
  t.is(logger.warn(message), `${Chalk.yellow('[WARN]')} test`)
  t.is(logger.error(message), `${Chalk.red('[ERROR]')} test`)
  t.is(logger.success(message), `test`)
})

test('trace enabled', t => {
  const logger = new Logger()
  logger.logFn = stubLogFn
  logger.traceEnabled = true
  t.plan(5)
  t.is(logger.trace(message), `test`)
  t.is(logger.info(message), `test`)
  t.is(logger.warn(message), `${Chalk.yellow('[WARN]')} test`)
  t.is(logger.error(message), `${Chalk.red('[ERROR]')} test`)
  t.is(logger.success(message), `test`)
})

test('verbose disabled', t => {
  const logger = new Logger()
  logger.logFn = stubLogFn
  logger.verboseEnabled = false
  t.plan(5)
  t.is(logger.trace(message), undefined)
  t.is(logger.info(message), undefined)
  t.is(logger.warn(message), `${Chalk.yellow('[WARN]')} test`)
  t.is(logger.error(message), `${Chalk.red('[ERROR]')} test`)
  t.is(logger.success(message), `test`)
})

test('trace enabled, verbose disabled', t => {
  const logger = new Logger()
  logger.logFn = stubLogFn
  logger.traceEnabled = true
  logger.verboseEnabled = false
  t.plan(5)
  t.is(logger.trace(message), `test`)
  t.is(logger.info(message), `test`)
  t.is(logger.warn(message), `${Chalk.yellow('[WARN]')} test`)
  t.is(logger.error(message), `${Chalk.red('[ERROR]')} test`)
  t.is(logger.success(message), `test`)
})

test('all enabled, prefix set', t => {
  const logger = new Logger()
  logger.logFn = stubLogFn
  logger.traceEnabled = true
  logger.verboseEnabled = true
  logger.prefix = 'prefix'
  t.plan(5)
  t.is(logger.trace(message), `${Chalk.gray('[prefix]')} test`)
  t.is(logger.info(message), `${Chalk.cyan('[prefix]')} test`)
  t.is(logger.warn(message), `${Chalk.yellow('[prefix]')} ${Chalk.yellow('[WARN]')} test`)
  t.is(logger.error(message), `${Chalk.red('[prefix]')} ${Chalk.red('[ERROR]')} test`)
  t.is(logger.success(message), `${Chalk.green('[prefix]')} test`)
})
