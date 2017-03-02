'use strict'

const Logger = require('../util/logger')
const Repository = require('../common/repository')

class Dot {
  constructor (config) {
    this.config = config
    this.repository = new Repository(config)
  }

  async run () {
    await this.repository.populate()
    const stmts = []
    Object.values(this.repository.issues).forEach((issue) => {
      stmts.push(`"${issue.key}"`)
      issue.links.forEach((link) => {
        stmts.push(`"${issue.key}"->"${link.key}"[label="${link.desc}"]`)
      })
    })
    const dot = `digraph{${stmts.join(';')}}`

    Logger.global.success(`dot generated:\n${dot}`)
  }
}

exports = module.exports = Dot
