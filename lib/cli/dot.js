'use strict'

const Logger = require('../util/logger')
const Exec = require('child-process-promise').exec
const Fsp = require('fs-promise')
const Path = require('path')

class Dot {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
    this.rootDir = Path.resolve(this.config.path, 'output', 'dot')
  }

  async run () {
    await this.jirascope.populate()
    await this.jirascope.store()
    await Fsp.ensureDir(this.rootDir)

    Logger.global.info(`${this.jirascope.graphs.length} graphs found`)

    const dots = this.jirascope.graphs.map((graph) => {
      let stmts = []
      graph.nodes.forEach((issue) => {
        let stmt = `"${issue.key}"`
        if (issue.statusCategory === 'Done') {
          stmt += `[shape="doublecircle"]`
        } else {
          stmt += `[shape="circle"]`
        }
        // ??? style=filled, fillcolor=red
        stmts.push(stmt)
      })
      graph.edges.forEach((link) => {
        if (link.direction === 'inward') {
          stmts.push(`"${link.srcKey}"->"${link.dstKey}"[label="${link.label}"]`)
        }
      })
      return `digraph{\n  ${stmts.join(';\n  ')}\n}`
    })

    const writes = dots.map((dot, i) => {
      const dotFileName = Path.resolve(this.rootDir, `${i}.dot`)
      return Fsp.writeFile(dotFileName, dot)
    })
    for (let write of writes) {
      await write
    }

    const execs = dots.map((dot, i) => {
      const dotFileName = Path.resolve(this.rootDir, `${i}.dot`)
      const pngFileName = Path.resolve(this.rootDir, `${i}.png`)
      return Exec(`dot -Tpng -o ${pngFileName} ${dotFileName}`)
    })
    for (let exec of execs) {
      await exec
    }
  }
}

exports = module.exports = Dot
