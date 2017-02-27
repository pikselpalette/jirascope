'use strict'

const Fsp = require('fs-promise')
const Path = require('path')

class Store {
  constructor (config) {
    this.config = config
  }
  async readJSON (path) {
    const filename = Path.resolve(Path.dirname(this.config.config), path)
    await Fsp.ensureDir(Path.dirname(filename))
    let data

    try {
      const dataContents = await Fsp.readFile(filename)
      data = JSON.parse(dataContents)
    } catch (err) {
      if (err.code === 'ENOENT') {
        data = undefined
      } else {
        throw err
      }
    }
    return data
  }
  async writeJSON (path, data) {
    const filename = Path.resolve(Path.dirname(this.config.config), path)
    await Fsp.ensureDir(Path.dirname(filename))
    await Fsp.writeFile(filename, JSON.stringify(data, null, 2) + '\n')
  }
}

exports = module.exports = Store
