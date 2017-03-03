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
      let stmt = `"${issue.key}"`
      if (issue.statusCategory === 'Done') {
        stmt += `[shape="doublecircle"]`
      } else {
        stmt += `[shape="circle"]`
      }
      // ??? style=filled, fillcolor=red
      stmts.push(stmt)
      issue.links.forEach((link) => {
        stmts.push(`"${link.srcKey}"->"${link.dstKey}"[label="${link.label}"]`)
      })
    })
    const dot = `digraph{${stmts.join(';')}}`

    Logger.global.success(`dot generated:\n${dot}`)
  }
}

exports = module.exports = Dot
