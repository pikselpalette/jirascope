'use strict'

const Exec = require('child-process-promise').exec
const Fsp = require('fs-promise')
const Path = require('path')

const escape = require('escape-html')

const Logger = require('../util/logger')

const statusCategoryBGColor = {
  'To Do': '#007DBA',
  'In Progress': '#F2A900',
  'Done': '#009A44'
}

function statusColor (issue) {
  if (issue.analysis.problems > 0) {
    return '#DA291C'
  }
  return statusCategoryBGColor[issue.statusCategory]
}

function statusLabel (issue) {
  return '&nbsp;'
}

function typeColor (issue) {
  if (issue.labels.includes('strategic')) {
    return '#009A44'
  }
  return '#FFFFFF'
}

function typeLabel (issue) {
  if (issue.labels.includes('strategic')) {
    return 'S'
  }
  return '&nbsp;'
}

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
        let stmt = `"${issue.key}"[`
        stmt += `label=<<TABLE BORDER="0" CELLBORDER="1" CELLPADDING="4" CELLSPACING="0">`
        stmt += `<TR>`
        stmt += `<TD BGCOLOR="${typeColor(issue)}">${typeLabel(issue)}</TD>`
        stmt += `<TD>${escape(issue.key)}</TD>`
        stmt += `<TD BGCOLOR="${statusColor(issue)}">${statusLabel(issue)}</TD>`
        stmt += `</TR>`
        stmt += `</TABLE>>`
        stmt += `]`
        stmts.push(stmt)
      })
      graph.edges.forEach((link) => {
        stmts.push(`"${link.srcKey}"->"${link.dstKey}"`)
      })
      return `digraph{
  rankdir=LR
  node [shape=plain]
  ${stmts.join(';\n  ')}
}`
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
