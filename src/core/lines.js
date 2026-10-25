/**
 * Line assembly for a command's captured streams.
 *
 * stdout/stderr arrive as arbitrary byte-decoded chunks, so a single read can
 * end mid-line. The carry string keeps that fragment until the next read (or
 * until the process settles) so the panel never shows half a line twice.
 * @module dsh-cmd-live/lines
 */

/**
 * Split a chunk into complete lines.
 * @param text - chunk of stdout/stderr.
 * @param carry - unfinished trailing line from the previous chunk.
 * @returns the complete lines plus the new carry.
 */
export function drainLines(text, carry) {
  const buffer = (carry ?? '') + (text ?? '')
  const parts = buffer.split('\n')
  const nextCarry = parts.pop() ?? ''
  const lines = []
  for (const part of parts) {
    // A pipe or a progress bar may leave a CR; it would render as a box.
    lines.push(part.endsWith('\r') ? part.slice(0, -1) : part)
  }
  return { lines, carry: nextCarry }
}

/**
 * Drop a trailing CR from an unterminated final line.
 * @param text - final carry.
 * @returns the displayable line.
 */
export function finishLine(text) {
  return text.endsWith('\r') ? text.slice(0, -1) : text
}
