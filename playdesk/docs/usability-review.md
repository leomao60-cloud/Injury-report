# Usability review: a high school coach's first visit (Step 8)

The ten biggest problems found reviewing the editor as a first-time high school coach.
BUILD_PLAN says to wait for a pick before fixing; items marked **fixed** were small enough, or
blocking enough, that they were fixed during the build. Everything left open in the first pass was fixed in a follow-up.

| #   | Problem                                                                                                                             | Status                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Players were small targets on phones and tablets; easy to miss when dragging.                                                       | **Fixed:** larger invisible touch target around each player.                                        |
| 2   | Typing a label and then pressing a letter (e.g. E) typed into the label instead of changing tool.                                   | **Fixed:** Enter leaves the label box.                                                              |
| 3   | Refreshing right after an edit could lose it.                                                                                       | **Fixed:** the open play is saved synchronously on every change.                                    |
| 4   | You can't move a single break point of a route after drawing it; you have to erase and redraw.                                      | **Fixed:** select a line with the Move tool and drag its orange dots.                               |
| 5   | Routes are straight segments only; no curved routes (wheel, swing, fade).                                                           | **Fixed:** a “Curved” option on any line; exports draw the same curve.                              |
| 6   | You can't add or remove players (unbalanced lines, special teams, 9-man/8-man football).                                            | **Fixed:** Add player / Add defender buttons, and Delete player in Selection.                       |
| 7   | Only one defense (4-3 two-deep). Coaches will want 3-4, 4-2-5, Cover 3 and so on, and to save their own.                            | **Fixed:** three fronts: 4-3 Cover 2, 3-4 Cover 3, 4-2-5 Cover 1. (Saving your own is still to do.) |
| 8   | On a phone, the Selection panel is far below the field, so editing a player means scrolling away.                                   | **Fixed:** on phones the Selection panel moves right under the field.                               |
| 9   | Sheets only use plays saved to the library; a new play in the editor must be saved first, and nothing says so on the Sheets screen. | **Fixed:** Sheets says so, and offers to save the open play.                                        |
| 10  | No first-run guidance beyond the hint line; a coach may not discover that you click a player first to start a route.                | **Fixed:** a dismissible quick-start card above the field.                                          |
