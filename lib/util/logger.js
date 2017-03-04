'use strict'

const Chalk = require('chalk')

class Logger {
  constructor () {
    this.verboseEnabled = true
    this.traceEnabled = false
    this.logFn = console.log
  }
  trace (...args) {
    if (this.traceEnabled) {
      args.unshift(Chalk.gray(`[TRACE]`))
      return this.logFn.apply(this, args)
    }
  }
  info (...args) {
    if (this.verboseEnabled || this.traceEnabled) {
      args.unshift(Chalk.cyan(`[INFO ]`))
      return this.logFn.apply(this, args)
    }
  }
  warn (...args) {
    args.unshift(Chalk.yellow(`[WARN ]`))
    return this.logFn.apply(this, args)
  }
  error (...args) {
    args.unshift(Chalk.red(`[ERROR]`))
    return this.logFn.apply(this, args)
  }
  chain (prefix) {
    let parent = this
    return {
      trace: (...args) => {
        args.unshift(prefix)
        return parent.trace(...args)
      },
      info: (...args) => {
        args.unshift(prefix)
        return parent.info(...args)
      },
      warn: (...args) => {
        args.unshift(prefix)
        return parent.warn(...args)
      },
      error: (...args) => {
        args.unshift(prefix)
        return parent.error(...args)
      }
    }
  }
}
Logger.global = new Logger()

exports = module.exports = Logger
