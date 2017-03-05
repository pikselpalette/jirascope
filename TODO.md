# TODO list

* configurable crawler behaviour
  * ancestors and descendants
  * all
  * distance, depth
  * stop conditions (e.g. done tickets)
* better command line handling:
  * validate args
  * move to https://github.com/mattallty/Caporal.js
* Visualisation of the graph data to find:
  * Root nodes (esp. those not flagged as strategic)
  * Leaf nodes - these are things that can be progressed
  * Cycle / Loop - these need fixing (see http://stackoverflow.com/questions/261573/best-algorithm-for-detecting-cycles-in-a-directed-graph)
  * Check for done issue with non-done dependencies
  * Least cost planning - roll up of efforts etc
