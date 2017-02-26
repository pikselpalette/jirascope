'use strict'

const Chalk = require('chalk')

class Logger {
  constructor (config) {
    this.config = config
  }
  info (...args) {
    if (this.config.verbose || this.config.trace) {
      args.unshift(Chalk.cyan(`[${this.config.appName}]`))
      console.log.apply(this, args)
    }
  }
  trace (...args) {
    if (this.config.trace) {
      args.unshift(Chalk.gray(`[${this.config.appName}]`))
      console.log.apply(this, args)
    }
  }
  warn (...args) {
    args.unshift(Chalk.yellow(`[${this.config.appName}] [WARN]`))
    console.log.apply(this, args)
  }
  error (...args) {
    args.unshift(Chalk.red(`[${this.config.appName}] [ERROR]`))
    console.log.apply(this, args)
  }
  success (...args) {
    args.unshift(Chalk.green(`[${this.config.appName}]`))
    console.log.apply(this, args)
  }
}

exports = module.exports = Logger
