'use strict'

const define = function (prog, config) {
  prog.command('config')
    .help('displays config for debugging purposes')
    .argument('[arg...]', 'args')
    .option('--optInt <int>', 'option <int> for some purpose', prog.INT)
    .action(function (args, options, logger) {
      run(this, args, options, logger, config)
    })
}

const run = function (command, args, options, logger, config) {
  logger.info('config', config)
}

exports = module.exports = {
  define
}
