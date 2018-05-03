'use strict';

const acquit = require('acquit');

module.exports = transform;
module.exports.findTest = findTest;

/**
 * Given a string `str` and some mocha `tests` as raw code or parsed acquit
 * output, replaces all instances of the string `[require:<regexp>]` with the
 * first test that matches `regexp`
 *
 * @param {string} str
 * @param {Array|string} tests
 * @return {string|null} the transformed string
 */

function transform(str, tests) {
  const matches = str.match(/\[require:.+\]/g);
  if (!matches) {
    return str;
  }

  for (const match of matches) {
    const test = findTest(match.substring('[require:'.length, match.length - 1), tests);
    if (test != null) {
      str = str.replace(match, test);
    }
  }

  return str;
}

/**
 * Given a regexp or string and some mocha `tests` as raw code or parsed acquit
 * output, finds the first mocha test that matches `regexp`.
 *
 * @param {RegExp|string} regexp
 * @param {Array|string} tests
 * @return {string|null} the source code of the matching test, if found.
 */

function findTest(regexp, tests) {
  if (typeof tests === 'string') {
    tests = acquit.parse(tests);
  }
  if (typeof regexp === 'string') {
    regexp = new RegExp(regexp);
  }

  return _findTest(regexp, tests, '');
}

function _findTest(regexp, tests, baseStr) {
  for (const block of tests) {
    const fullTestDescription = [baseStr, block.contents].
      filter(s => !!s).
      join(' ');
    switch (block.type) {
      case 'describe':
        // If regexp already matches, just take the first test underneath
        // this `describe()`
        if (regexp.test(fullTestDescription)) {
          return _findTest(/.*/, block.blocks, fullTestDescription);
        }
        // Otherwise, keep trying recursively. If we find one, use it.
        const res = _findTest(regexp, block.blocks, fullTestDescription);
        if (res != null) {
          return res;
        }
        break;
      case 'it':
        if (regexp.test(fullTestDescription)) {
          return block.code;
        }
        break;
      default:
        break;
    }
  }
};