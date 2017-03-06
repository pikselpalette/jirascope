## Graphviz & Dot

`jirascope dot` will convert every graph found into `dot` notation and pass to `graphviz` to render as a png.  By
default this is placed in the `output/dot` directory.

### Key

Nodes are formatted in accordance with the following:

  * the first cell represents the status category:
    * `blue` is `To Do`
    * `orange` is `In Progress`
    * `green` is `Done`
  * the second cell is the ticket key
  * the remaining cells are indicators:
    * `S` represents an issue labelled as `strategic`
    * `P` represents an issue labelled as `placeholder`
    * `I` represents an issue labelled as `incomplete`

Arrows show the direction of a dependency, with the arrow head being on the side of the descendant.
