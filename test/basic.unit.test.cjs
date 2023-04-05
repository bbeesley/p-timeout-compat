const test = require('ava');
const delay = require('delay');

const fixture = Symbol('fixture');
const fixtureError = new Error('fixture');

let pTimeout;
let TimeoutError;

const min = (left, right) => left < right ? left : right;
const max = (left, right) => left > right ? left : right;

const isNumberOrBigInt = value => ['number', 'bigint'].includes(typeof value);

const inRange = (number, {start = 0, end}) => {
	if (
		!isNumberOrBigInt(number) ||
		!isNumberOrBigInt(start) ||
		!isNumberOrBigInt(end)
	) {
		throw new TypeError('Expected each argument to be either a number or a BigInt');
	}

	return number >= min(start, end) && number <= max(end, start);
};

function convertHrtime(hrtime) {
	const nanoseconds = hrtime;
	const number = Number(nanoseconds);
	const milliseconds = number / 1000000;
	const seconds = number / 1000000000;

	return {
		seconds,
		milliseconds,
		nanoseconds
	};
}
function timeSpan() {
	const start = process.hrtime.bigint();
	const end = type => convertHrtime(process.hrtime.bigint() - start)[type];

	const returnValue = () => end('milliseconds');
	returnValue.rounded = () => Math.round(end('milliseconds'));
	returnValue.seconds = () => end('seconds');
	returnValue.nanoseconds = () => end('nanoseconds');

	return returnValue;
}

test.before(() => {
  let { default: module, TimeoutError: error } = require('../');
  pTimeout = module;
  TimeoutError = error;
})

test('can be required', (t) => {
  t.is(typeof pTimeout, 'function');
  t.is(pTimeout.name, 'pTimeout');
});

test('resolves before timeout', async t => {
	t.is(await pTimeout(delay(50).then(() => fixture), {milliseconds: 200}), fixture);
});

test('throws when milliseconds is not number', async t => {
	await t.throwsAsync(pTimeout(delay(50), {milliseconds: '200'}), {instanceOf: TypeError});
});

test('throws when milliseconds is negative number', async t => {
	await t.throwsAsync(pTimeout(delay(50), {milliseconds: -1}), {instanceOf: TypeError});
});

test('throws when milliseconds is NaN', async t => {
	await t.throwsAsync(pTimeout(delay(50), {milliseconds: Number.NaN}), {instanceOf: TypeError});
});

test('handles milliseconds being `Infinity`', async t => {
	t.is(
		await pTimeout(delay(50, {value: fixture}), {milliseconds: Number.POSITIVE_INFINITY}),
		fixture,
	);
});

test('rejects after timeout', async t => {
	await t.throwsAsync(pTimeout(delay(200), {milliseconds: 50}), {instanceOf: TimeoutError});
});

test('resolves after timeout with message:false', async t => {
	t.is(
		await pTimeout(delay(200), {milliseconds: 50, message: false}),
		undefined,
	);
});

test('rejects before timeout if specified promise rejects', async t => {
	await t.throwsAsync(pTimeout(delay(50).then(() => {
		throw fixtureError;
	}), {milliseconds: 200}), {message: fixtureError.message});
});

test('fallback argument', async t => {
	await t.throwsAsync(pTimeout(delay(200), {milliseconds: 50, message: 'rainbow'}), {message: 'rainbow'});
	await t.throwsAsync(pTimeout(delay(200), {milliseconds: 50, message: new RangeError('cake')}), {instanceOf: RangeError});
	await t.throwsAsync(pTimeout(delay(200), {milliseconds: 50, fallback: () => Promise.reject(fixtureError)}), {message: fixtureError.message});
	await t.throwsAsync(pTimeout(delay(200), {milliseconds: 50, fallback() {
		throw new RangeError('cake');
	}}), {instanceOf: RangeError});
});

test('accepts `customTimers` option', async t => {
	t.plan(2);

	await pTimeout(delay(50), {
		milliseconds: 123,
		customTimers: {
			setTimeout(fn, milliseconds) {
				t.is(milliseconds, 123);
				return setTimeout(fn, milliseconds);
			},
			clearTimeout(timeoutId) {
				t.pass();
				return clearTimeout(timeoutId);
			},
		},
	});
});

test('`.clear()` method', async t => {
	const end = timeSpan();
	const promise = pTimeout(delay(300), {milliseconds: 200});

	promise.clear();

	await promise;
	t.true(inRange(end(), {start: 0, end: 350}));
});

/**
TODO: Remove if statement when targeting Node.js 16.
*/
if (globalThis.AbortController !== undefined) {
	test('rejects when calling `AbortController#abort()`', async t => {
		const abortController = new AbortController();

		const promise = pTimeout(delay(3000), {
			milliseconds: 2000,
			signal: abortController.signal,
		});

		abortController.abort();

		await t.throwsAsync(promise, {
			name: 'AbortError',
		});
	});

	test('already aborted signal', async t => {
		const abortController = new AbortController();

		abortController.abort();

		await t.throwsAsync(pTimeout(delay(3000), {
			milliseconds: 2000,
			signal: abortController.signal,
		}), {
			name: 'AbortError',
		});
	});
}
