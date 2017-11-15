'use strict'

const _ = require('lodash')

const Exec = require('child-process-promise').exec
const Fsp = require('fs-promise')
const Path = require('path')

const htmlEscape = require('escape-html')

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
  'Requirement': {
    label: 'R',
    color: '#ADD8E6'
  },
  'Initiative': {
    label: 'I',
    color: '#DDA0DD'
  }
}

const priority = {
  'Highest': {
    label: '⬆'
  },
  'High': {
    label: '⬈'
  },
  'Medium': {
    label: '⬌'
  },
  'Low': {
    label: '⬊'
  },
  'Lowest': {
    label: '⬇'
  }
}

function escape (str) {
  return htmlEscape(str).replace(/\[/g, '&#91;').replace(/]/g, '&#93;')
}

function statusColor (issue) {
  const match = status[issue.statusCategory]
  return (match && match.color) || '#FFFFFF'
}

function statusText (issue) {
  return `${priority[issue.priority].label} ${issue.analysis.totalScore}`
}

function typeColor (issue) {
  const match = types[issue.type]
  return (match && match.color) || '#FFFFFF'
}

function typeText (issue) {
  const match = types[issue.type]
  return (match && match.label) || issue.type.substring(0, 1)
}

function labelColor (issue) {
  if (issue.analysis.warnings.length > 0) {
    return '#F08080'
  }
  return '#FFFFFF'
}

function labelText (issue) {
  return escape(_.chain(issue.key).truncate(keySize).pad(keySize).value())
}

function summaryText (issue) {
  return escape(_.chain(issue.summary).truncate(summarySize).pad(summarySize).value())
}

const keySize = 20
const summarySize = keySize + 2

function dotifyNode (issue) {
  let stmt = `"${issue.key}"[`
  stmt += `label=<<TABLE BORDER="0" CELLBORDER="1" CELLPADDING="4" CELLSPACING="0">`
  stmt += `<TR>`
  stmt += `<TD BGCOLOR="${typeColor(issue)}">${typeText(issue)}</TD>`
  stmt += `<TD BGCOLOR="${labelColor(issue)}" ALIGN="TEXT">${labelText(issue)}</TD>`
  stmt += `<TD BGCOLOR="${statusColor(issue)}">${statusText(issue)}</TD>`
  stmt += `</TR>`
  stmt += `<TR><TD COLSPAN="3" BGCOLOR="#FFFFFF">${summaryText(issue)}</TD></TR>`
  stmt += `</TABLE>>`
  stmt += `];`
  return stmt
}

function dotifyLink (link) {
  return `"${link.srcKey}"->"${link.dstKey}";`
}

function dotifySubgraph (graph, name, label = name) {
  let stmts = []
  stmts.push(...(graph.nodes || []).map(dotifyNode))
  stmts.push(...(graph.edges || []).map(dotifyLink))
  return `subgraph cluster_${name} {
style=filled;
color=lightgrey;
${stmts.join('\n  ')}
}`
}

function dotifyGraph (graph) {
  const groupedNodes = _.chain(graph.nodes).groupBy((node) => {
    if (node.type === 'Epic') {
      return node.key
    }
    if (node.epicKey) {
      return node.epicKey
    }
    return 'root'
  }).mapValues((nodes) => { return { nodes } }).value()
  const groupedEdges = _.chain(graph.edges).groupBy((edge) => {
    if (edge.type === 'Epic') {
      return edge.srcKey
    }
    return 'root'
  }).mapValues((edges) => { return { edges } }).value()
  const groupedGraphs = _.merge(groupedNodes, groupedEdges)

  let stmts = []
  let subgraphCounter = 0
  _.forIn(groupedGraphs, function (value, key) {
    if (key !== 'root') {
      stmts.push(dotifySubgraph(value, subgraphCounter++, key))
    }
  })
  if (groupedGraphs['root'].nodes) {
    stmts.push(...groupedGraphs['root'].nodes.map(dotifyNode))
  }
  if (groupedGraphs['root'].edges) {
    stmts.push(...groupedGraphs['root'].edges.map(dotifyLink))
  }
  return `digraph{
rankdir=LR
node [shape=plain]
${stmts.join('\n  ')}
}`
}

class Dot {
  constructor (config, jirascope) {
    this.config = config
    this.jirascope = jirascope
    this.dotDir = Path.resolve(this.config.output, 'dot')
    this.graphsDir = Path.resolve(this.config.output, 'graphs')
  }

  async run () {
    await this.jirascope.populate()
    await this.jirascope.store()
    await Fsp.ensureDir(this.dotDir)
    await Fsp.ensureDir(this.graphsDir)

    Logger.global.info(`${this.jirascope.graphs.length} graphs found`)

    const dots = this.jirascope.graphs.map(dotifyGraph)

    const writes = dots.map((dot, i) => {
      const dotFileName = Path.resolve(this.dotDir, `${_.padStart(i, 3, '0')}.dot`)
      return Fsp.writeFile(dotFileName, dot)
    })
    for (let write of writes) {
      await write
    }

    const execs = dots.map((dot, i) => {
      const dotFileName = Path.resolve(this.dotDir, `${_.padStart(i, 3, '0')}.dot`)
      const pngFileName = Path.resolve(this.graphsDir, `${_.padStart(i, 3, '0')}.png`)
      return Exec(`dot -Tpng -o '${pngFileName}' '${dotFileName}'`)
    })
    for (let exec of execs) {
      await exec
    }
  }
}

exports = module.exports = Dot
