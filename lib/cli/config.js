'use strict'

class Config {
  define (prog, config) {
    this.config = config
    prog.command('config')
      .help('display config')
      .action((args, options, logger) => {
        this.run(args, options, logger || args.logger)
      })
  }

  run (args, options, logger) {
    console.log('args:', args)
    console.log('options:', options)
    console.log('logger:', args.logger)
    logger.info('config:', this.config)
  }
}

exports = module.exports = Config
