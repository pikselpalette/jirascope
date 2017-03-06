## Graphviz & Dot

`jirascope dot` will convert every graph found into `dot` notation and pass to `graphviz` to render as a png.  By
default this is placed in the `output/dot` directory.

### Key

Nodes are formatted in accordance with the following:

  * the first cell represents the type:
    * `S` and `green` represents an issue labelled as `strategic`
  * the second cell is the ticket key
  * the last cell represents the status:
    * `red` is that the issue is flagged with a problem
    * `blue` is `To Do` category
    * `orange` is `In Progress` category
    * `green` is `Done` category

Arrows show the direction of a dependency, with the arrow head being on the side of the descendant.
