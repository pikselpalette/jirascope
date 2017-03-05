'use strict'

const Logger = require('../util/logger')
const Exec = require('child-process-promise').exec;
const Fsp = require('fs-promise')

class Dot {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
  }

  determineGraphs (issues) {
    const graphs = []
    while (Object.keys(issues).length !== 0) {
      Logger.global.trace(`issues left to consider: ${Object.keys(issues).length}`)
      const stack = Object.keys(issues).splice(0, 1) // seed the stack
      if (stack.length !== 0) {
        const graph = {}
        Logger.global.trace(`starting a new graph with ${stack}`)
        while (stack.length !== 0) {
          const key = stack.pop()
          Logger.global.trace(`considering ${key}, remaining stack is ${stack}`)
          const issue = issues[key]
          if (issue) {
            issue.links.forEach((link) => { stack.unshift(link.dstKey) })
            graph[key] = issue
            delete issues[key]
          }
        }
        if (Object.keys(graph).length > 1) { // skip orphans
          graphs.push(graph)
        }
      }
    }
    return graphs
  }

  async run () {
    await this.jirascope.populate()

    const graphs = this.determineGraphs(this.jirascope.issues)

    Logger.global.info(`${graphs.length} graphs found`)

    const dots = graphs.map((graph) => {
      let stmts = []
      Object.values(graph).forEach((issue) => {
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
      return `digraph{\n  ${stmts.join(';\n  ')}\n}`
    })

    const writes = dots.map((dot, i) => {
      return Fsp.writeFile(`${i}.dot`, dot)
    })
    for (let write of writes) {
      await write
    }

    const execs = dots.map((dot, i) => {
      return Exec(`dot -Tpng -o ${i}.png -Grankdir=LR ${i}.dot`)
    })
    for (let exec of execs) {
      await exec
    }
  }
}

exports = module.exports = Dot
