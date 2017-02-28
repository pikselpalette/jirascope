'use strict'

const Logger = require('../util/logger')
const Repository = require('../common/repository')

class Extract {
  constructor (config) {
    this.config = config
    this.repository = new Repository(config)
  }

  async run () {
    await this.repository.init()
    await this.repository.store()
    Logger.global.success(`extracted ${Object.keys(this.repository.issues).length} issues`)
    return
  }
}

exports = module.exports = Extract
