# @expo/results
[![Tests](https://github.com/expo/results/workflows/Tests/badge.svg)](https://github.com/expo/results/actions?query=branch%3Amaster)
[![codecov](https://codecov.io/gh/expo/results/branch/master/graph/badge.svg)](https://codecov.io/gh/expo/results)

An efficient, standards-compliant library for representing results of successful or failed operations. A result object represents the result of an operation that can either return a value successfully or fail. Typically we'd simply either return a value or throw an error, but sometimes we perform multiple operations as a batch, some of which may succeed and others fail. Since we can't simultaneously return values and throw errors, we instead return collections of result objects. This allows a batch operation to return values for successful operations and errors for failed ones without loss of information, namely the errors. (In contrast, sometimes it is appropriate for a batch operation to return just successful values and omit values for failed operations.)

- [Usage](#usage)
  - [Using Results](#using-results)
  - [Creating Results](#creating-results)
- [API](#api)
  - `Result<T>`
  - `ResultStatus`
  - `result<T>(value: T | Error): Result<T>`
  - `asyncResult<T>(promise: Promise<T>): Promise<Result<T>>`
  - `enforceAsyncResult<T>(resultPromise: Promise<Result<T>>): Promise<T>`
- [Changelog](./CHANGELOG.md)
- [API History](./API_HISTORY.md)

---

# Usage

## Using Results

```ts
import { Result, result } from '@expo/results';

const results = await fetchWebPages(['https://expo.dev', 'http://example.com']);
for (const result of results) {
  if (result.ok) {
    console.log(result.value);
  } else {
    console.error(result.reason);
  }
}
```

## Creating Results

```ts
import { Result, result } from '@expo/results';

/**
 * The purpose of this result API is to let you write functions that can
 * partially succeed and partially fail and return all of that information to
 * the caller.
 */
function fetchWebPages(urls: string[]): Promise<Result<string>[]> {
  return Promise.all(urls.map(fetchWebPage));
}

async function fetchWebPage(url: string): Promise<Result<string>> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    return result(text);
  } catch (e) {
    return result(e);
  }
}

// Or more idiomatically:

function fetchWebPage(url: string): Promise<Result<string>> {
  return asyncResult(fetch(url).then(response => response.text()));
}
```

---

# API

## `Result<T>`

The main type that represents the result of either a successful operation or a failed one.

### Properties
- `ok: boolean`: whether the result represents a success or a failure. Successes always have a result value and never have a failure reason, while failures always have a failure reason and never have a result value. This property is provided for convenience instead of checking the `status` property.
- `status: ResultStatus`: the status of the result: either "fulfilled" or "rejected". This property and its possible values are the same as the `status` field of standard promise results. See the [ResultStatus](#resultstatus) enum.
- `value: T | undefined`: the value of the result, if it represents a success. This property is always `undefined` if the result represents a failure.
- `reason: Error | undefined`: the reason the operation that created the result failed, if the result represents a failure. This property is always `undefined` if the result represents a success.

**TypeScript note:** when you check the `ok` or `status` properties to see if the result represents a success, the Result API is written so that the type checker knows `value` is defined and `reason` is not. This ergonomic design means you often don't need to use TypeScript's non-null assertion operator and can write `result.value` instead of `result.value!`.

### Methods

#### `enforceValue(): T`

Returns the value of this result if it represents a success, or throws the underlying error if this result represents a failure. Use this when you are certain the operation that created the result succeeded and consider it to be a programming error otherwise.

#### `enforceReason(): Error`

Returns the error that caused this failure, or throws a `TypeError` if this result actually represents a success. Use this when you are certain the operation that created the result failed and consider it to be a programming error otherwise.

### Other Behavior

#### String Coercion

When printing `Result` objects as strings (for example, inside of a template string), results that represent successes are printed as `[Success object]` and results that represent failures as printed as `[Failure object]`.

#### JSON Formatting

`Result` objects define `toJSON()` and return an object with just the `status` and either `value` or `reason` fields, depending on whether the result represents a success or failure, respectively. `Result` objects are JSON-serialized the same way as objects returned from [`Promise.allSettled()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled).

## `ResultStatus`

An enum whose values represent the status of a result, namely whether it is from a successful operation or a failure.

- `Fulfilled = "fulfilled"`: the status of a result that represents a success
- `Rejected = "rejected"`: the status of a result that represents a failure

## `result<T>(value: T | Error): Result<T>`

The main function for creating `Result` objects. You may pass in any value or an error. If a value is passed in, the returned object represents a successful operation with the given value. If an error is passed in, the returned object represents a failed operation with the given reason.

Some operations don't return any values. To create a `Result<void>` instance, call `result()` with no argument.

The `result` function does not provide a way to create a `Result<Error>` instance, that is, a result of a successful operation whose return value was an error.

## `asyncResult<T>(promise: Promise<T>): Promise<Result<T>>`

Converts a regular promise into one that always successfully resolves to a `Result` object.

If the given promise is fulfilled, its fulfillment value is used to create a success result.

Otherwise, if the given promise is rejected, its rejection reason is used to create a failure result. If the given promise is rejected with a reason other than an `Error` object, the reason is coerced to a string and used as the error message of a new `Error` object.

## `enforceAsyncResult<T>(resultPromise: Promise<Result<T>>): Promise<T>`

Converts a promise that resolves to a `Result` object into a regular promise that either resolves to a successful value or is rejected with an error. This function is the inverse of [`asyncResult`](#asyncresult).
