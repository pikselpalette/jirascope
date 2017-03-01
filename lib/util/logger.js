'use strict'

const Chalk = require('chalk')

function applyPrefix (fn, args) {
  if (this.prefix) {
    args.unshift(fn(`[${this.prefix}]`))
  }
}

class Logger {
  constructor () {
    this.verboseEnabled = true
    this.traceEnabled = false
    this.prefix = undefined
    this.logFn = console.log
  }
  trace (...args) {
    if (this.traceEnabled) {
      applyPrefix.call(this, Chalk.gray, args)
      return this.logFn.apply(this, args)
    }
  }
  info (...args) {
    if (this.verboseEnabled || this.traceEnabled) {
      applyPrefix.call(this, Chalk.cyan, args)
      return this.logFn.apply(this, args)
    }
  }
  warn (...args) {
    args.unshift(Chalk.yellow(`[WARN]`))
    applyPrefix.call(this, Chalk.yellow, args)
    return this.logFn.apply(this, args)
  }
  error (...args) {
    args.unshift(Chalk.red(`[ERROR]`))
    applyPrefix.call(this, Chalk.red, args)
    return this.logFn.apply(this, args)
  }
  success (...args) {
    applyPrefix.call(this, Chalk.green, args)
    return this.logFn.apply(this, args)
  }
}
Logger.global = new Logger()

exports = module.exports = Logger
