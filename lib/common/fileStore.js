'use strict'

const Fsp = require('fs-promise')
const Path = require('path')
const Stringify = require('json-stable-stringify')

const Logger = require('../util/logger')
const logger = Logger.global.chain('[fs]')

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
      logger.info(`read '${resourceName}.json'`)
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
    await Fsp.writeFile(filename, Stringify(data, {space: 2}) + '\n')
    logger.info(`wrote '${resourceName}.json'`)
  }

  async deleteData (resourceName) {
    const filename = Path.resolve(this.rootPath, `${resourceName}.json`)
    await Fsp.unlink(filename)
    logger.info(`deleted '${resourceName}.json'`)
  }
}

exports = module.exports = FileStore
