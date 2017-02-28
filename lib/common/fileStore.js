'use strict'

const Fsp = require('fs-promise')
const Path = require('path')

const Logger = require('../util/logger')

class FileStore {
  constructor (rootPath) {
    this.rootPath = rootPath
  }

  async readData (resourceName) {
    const filename = Path.resolve(this.rootPath, `${resourceName}.json`)
    let data

    try {
      const dataContents = await Fsp.readFile(filename)
      data = JSON.parse(dataContents)
      Logger.global.info(`read '${resourceName}.json'`)
    } catch (err) {
      if (err.code === 'ENOENT') {
        data = undefined
      } else if (err.code === 'ENOTDIR') {
        data = undefined
      } else {
        throw err
      }
    }
    return data
  }

  async writeData (resourceName, data) {
    const filename = Path.resolve(this.rootPath, `${resourceName}.json`)
    await Fsp.ensureDir(Path.dirname(filename))
    await Fsp.writeFile(filename, JSON.stringify(data, null, 2) + '\n')
    Logger.global.info(`wrote '${resourceName}.json'`)
  }

  async deleteData (resourceName) {
    const filename = Path.resolve(this.rootPath, `${resourceName}.json`)
    await Fsp.unlink(filename)
    Logger.global.info(`deleted '${resourceName}.json'`)
  }
}

exports = module.exports = FileStore
