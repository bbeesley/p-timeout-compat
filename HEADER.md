# p-timeout-compat

Compatible version of p-timeout. Exports cjs and mjs versions of p-timeout and lets node select the appropriate one. Please see original readme below for details.

## install

`npm i --save p-timeout-compat`

## use

```js
import PQueue from 'p-queue-compat';
import got from 'got';

const queue = new PQueue({concurrency: 1});

(async () => {
	await queue.add(() => got('https://sindresorhus.com'));
	console.log('Done: sindresorhus.com');
})();
```
