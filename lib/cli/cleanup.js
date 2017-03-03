'use strict'

const Logger = require('../util/logger')
const Repository = require('../common/repository')

class Cleanup {
  constructor (config) {
    this.config = config
    this.repository = new Repository(config)
  }

  async run () {
    await this.repository.cleanup()
    Logger.global.success(`cleaned up`)
  }
}

exports = module.exports = Cleanup
