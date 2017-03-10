'use strict'

const _ = require('lodash')

const Exec = require('child-process-promise').exec
const Fsp = require('fs-promise')
const Path = require('path')

const escape = require('escape-html')

const Logger = require('../util/logger')

const status = {
  'To Do': {
    color: '#007DBA'
  },
  'In Progress': {
    color: '#F2A900'
  },
  'Done': {
    color: '#009A44'
  }
}

const types = {
  'Strategic': {
    label: 'S',
    color: '#FFD700'
  },
  'Requirement': {
    label: 'R',
    color: '#ADD8E6'
  },
  'Initiative': {
    label: 'I',
    color: '#DDA0DD'
  },
  'Milestone': {
    label: 'M',
    color: '#C0C0C0'
  }
}

function statusColor (issue) {
  const match = status[issue.statusCategory]
  return (match && match.color) || '#FFFFFF'
}

function statusText (issue) {
  return '&nbsp;'
}

function typeColor (issue) {
  const match = types[issue.type]
  return (match && match.color) || '#FFFFFF'
}

function typeText (issue) {
  const match = types[issue.type]
  return (match && match.label) || '&nbsp;'
}

function labelColor (issue) {
  if (issue.analysis.warnings.length > 0) {
    return '#F08080'
  }
  return '#FFFFFF'
}

function labelText (issue) {
  return _.chain(escape(issue.key)).truncate(keySize).pad(keySize).value()
}

function summaryText (issue) {
  return _.chain(escape(issue.summary)).truncate(summarySize).pad(summarySize).value()
}

const keySize = 20
const summarySize = keySize + 2

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
        stmt += `<TD BGCOLOR="${typeColor(issue)}">${typeText(issue)}</TD>`
        stmt += `<TD BGCOLOR="${labelColor(issue)}" ALIGN="TEXT">${labelText(issue)}</TD>`
        stmt += `<TD BGCOLOR="${statusColor(issue)}">${statusText(issue)}</TD>`
        stmt += `</TR>`
        stmt += `<TR><TD COLSPAN="3">${summaryText(issue)}</TD></TR>`
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
