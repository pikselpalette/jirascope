'use strict'

const Fsp = require('fs-promise')
const Path = require('path')

const Logger = require('../util/logger')

class Cleanup {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
    this.outputDir = Path.resolve(this.config.path, 'output')
  }

  async run () {
    await this.jirascope.cleanup()
    await Fsp.remove(this.outputDir)
    Logger.global.info(`cleaned up`)
  }
}

exports = module.exports = Cleanup
