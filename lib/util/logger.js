'use strict'

const Chalk = require('chalk')

function applyPrefix (fn, args) {
  if (this.prefix) {
    args.unshift(fn(`[${this.prefix}]`))
  }
}

class Logger {
  constructor () {
    this.verbose = true
    this.trace = false
    this.prefix = undefined
  }
  trace (...args) {
    if (this.trace) {
      applyPrefix.call(this, Chalk.gray, args)
      console.log.apply(this, args)
    }
  }
  info (...args) {
    if (this.verbose || this.trace) {
      applyPrefix.call(this, Chalk.cyan, args)
      console.log.apply(this, args)
    }
  }
  warn (...args) {
    applyPrefix.call(this, Chalk.yellow, args)
    args.unshift(Chalk.yellow(`[WARN]`))
    console.log.apply(this, args)
  }
  error (...args) {
    applyPrefix.call(this, Chalk.red, args)
    args.unshift(Chalk.red(`[ERROR]`))
    console.log.apply(this, args)
  }
  success (...args) {
    applyPrefix.call(this, Chalk.green, args)
    console.log.apply(this, args)
  }
}
Logger.global = new Logger()

exports = module.exports = Logger
