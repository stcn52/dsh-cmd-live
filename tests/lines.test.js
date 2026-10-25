import { test } from 'node:test'
import assert from 'node:assert/strict'
import { drainLines, finishLine } from '../src/core/lines.js'

test('drainLines keeps the unfinished tail as carry', () => {
  const first = drainLines('alpha\nbeta', '')
  assert.deepEqual(first.lines, ['alpha'])
  assert.equal(first.carry, 'beta')

  const second = drainLines('-gamma\ndelta\n', first.carry)
  assert.deepEqual(second.lines, ['beta-gamma', 'delta'])
  assert.equal(second.carry, '')
})

test('drainLines strips a trailing CR from complete lines', () => {
  const read = drainLines('one\r\ntwo\r\n', '')
  assert.deepEqual(read.lines, ['one', 'two'])
})

test('finishLine strips the final CR of an unterminated line', () => {
  assert.equal(finishLine('progress 40%\r'), 'progress 40%')
  assert.equal(finishLine('plain'), 'plain')
})

test('empty chunks do not disturb the carry', () => {
  const read = drainLines('', 'pending')
  assert.deepEqual(read.lines, [])
  assert.equal(read.carry, 'pending')
})
