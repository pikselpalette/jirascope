'use strict'

const Logger = require('../util/logger')

class Dot {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  async run () {
    await this.jirascope.populate()
    const stmts = []
    Object.values(this.jirascope.issues).forEach((issue) => {
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
