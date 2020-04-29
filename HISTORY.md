# "Result" API History

This is the history of the Result API (v1.0), which started with proposal for an API for handling the fact that batch operations can partially succeed and partially fail.

For example, when fetching several entities from a database, some requests may succeed, some may fail due to Postgres errors, and some may fail due to privacy rules. Sometimes we want to surface some information about the causes of the failure to the end user (e.g., you don’t have permission to see this vs. there was a temporary database error), so we want to keep information about the underlying errors. This Result API is a way to propagate both successful and failed results through a request.

# Prior APIs

## Old Expo API

Previously in our codebase we had a `ResultT` Flow type. This type exists only in the type system — it doesn’t make any objects at runtime. A `ResultT` is either a value of type `T` (in the success case) or an `ExpError` (in the failure case). We write `instanceof ExpError` checks to see whether a result is a value or an error.

This approach relies entirely on the type system. The only runtime overhead is the `instanceof` checks. If some code is not type checked, code that does not check if a result is an error will appear to work correctly until there is an error; this is dangerous.

There are also helper functions like `ok` and `unwrap` that accept results and, if they are errors, either return null or throw the error.

## ES2020 Promise Result API

There is actually a result API in standard JavaScript. [Promise.allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) accepts an array of promises and resolves to an array of result objects once all the promises have settled.

A promise result is a plain object with two fields, “status” and either “value” or “reason”.

> For each outcome object, a status string is present. If the status is “fulfilled”, then a value is present. If the status is “rejected”, then a reason is present. The value (or reason) reflects what value each promise was fulfilled (or rejected) with.

Since this is a standard API, making our Result API conform to the same interface could be useful.

One trade-off this API makes is that the “status” field is a string. This makes it possible to add more statuses in the future, like “cancelled”. It does add more typing to check the status (`result.status === 'fulfilled'`) than a Boolean field (`result.ok`).

Another trade-off is that the results are plain objects without methods. This makes them simple, but means we need to import helper functions (`getValueOrThrow(result)`) instead of having common methods on the object (`result.getValueOrThrow()`) (these functions names are verbose in this doc for sake of explaining what they do).

# The Proposal

Results are objects that we implement in TypeScript. This way we benefit from type checking and also are forced to handle result objects without accidentally treating them as successful values, since they are runtime objects.

It seems beneficial to make our result objects compatible with standard promise result objects. Two questions about compatibility are: can an Expo result be passed into code that expects a promise result? and can a promise result be passed into code that expects an Expo result? This API proposal says yes to the first and no to the second. This is because we may want the Expo result API to have more features than promise results; promise results won’t fully conform to the interface of Expo results.

## Draft API

```tsx
interface Result<T> {
  readonly status: 'fulfilled' | 'rejected';
  readonly ok: boolean;  // status === 'fulfilled'
  // We'd actually want to express that value is always T when the result is a
  // success but for simplicity here, the types below are naive
  readonly value: T | undefined;
  readonly reason: Error | undefined;

  // new Result(value) is straightforward
  constructor(value: T);

  // Like Promise.resolve(T)
  static of<T>(value: T): Result<T>;

  // Like Promise.reject(Error)
  static fail<T>(error: Error): Result<T>;

  // Converts the promise to one that always resolves to a Result object and
  // never is rejected
  static promise<T>(promise: Promise<T>): Promise<Result<T>>;

  // Converts standard promise results from Promise.allSettled into Expo results.
  // The spec calls these "promise state snapshots".
  static fromPromiseResult<T>(promiseResult): Result<T>;

  // These methods throw if the result is not a failure/success
  enforceValue(): T;
  enforceError(): Error;

  // When a result is printed, make it really clear that it is a result
  toString(): string;

  // When a result is serialized as JSON, we may want to return an object that
  // conforms to the same interface as a serialized standard promise result
  toJSON(): object;
}
```

This interface conforms to the standard promise result interface. It also provides static methods for constructing results from other objects, and instance methods for assertively getting non-undefined values and errors.

The API uses undefined instead of null like standard promise results do. Generally using null to represent the absence of a value is better than using undefined since it communicates that a value is intentionally null and we did not forget to set it, but confirming to the standard is one goal of this API. Also, both null and undefined are treated the same by the `?.` and `??` operators, so code like `result.value?.doSomething()` works either way (this expression returns undefined if the result‘s value is null or undefined).

## Example Usage

### Creating results

```ts
const value: T = ...;
// The inferred type is Result<T>
const successResult = new Result(value);

try { ... } catch (e) {
  // To infer that the type is Result<T>, the return type of this method must
  // be Result<T>
  const failureResult = Result.fail(e);
  return failureResult;
}
```

### Creating results from async operations

```js
// The inferred type is Result<T> if loadDataAsync() returns Promise<T>
const result = await Result.promise(loadDataAsync());

// These two statements produce the same output
const resultArray1 = await Promise.all(
  ids.map(id => Result.promise(deleteObjectAsync(id)))
);
const resultArray2 = (await Promise.allSettled(
  ids => map(id => deleteObjectAsync(id))
)).map(promiseResult => Result.fromPromiseResult(promiseResult));

// Perhaps this would be convenient but unclear how much we'll use allSettled
const resultArray3 = await Result.promiseFromPromiseResults(
  Promise.allSettled(ids => map(id => deleteObjectAsync(id)))
);
```

### Receiving results

```js
// The inferred type is T | undefined
const value = result.value;

if (result.ok /* or result.status === 'fulfilled' */) {
  // The inferred type is non-undefined T (unless T includes undefined)
  const value = result.value;
} else {
  // The inferred type is undefined
  const value = result.value;
}

// If we are sure that the result is a success and it would be a programming
// error otherwise, we can forcibly get its value. This way we don't need to
// check "result.ok" nor use TypeScript's "!", which doesn't guarantee the
// value is non-undefined at runtime. Furthermore, TypeScript's "!" doesn't
// accommodate the case when T includes null or undefined.
//
// The inferred type is non-undefined T.
const value = result.enforceValue();
```

### Serializing results

```js
// 'The result is: Result(fulfilled, hello)'
`The result is: ${successResult}`

// '[object Result]' (by setting Result.prototype[Symbol.toStringTag])
Object.prototype.toString.call(successResult);

// 'The result is: Result(rejected, Error: The database is unavailable)'
`The result is: ${failureResult}`

// '{"status":"fulfilled","value":"hello"}'
JSON.stringify(successResult);

// '{"status":"rejected","reason":{}}'
JSON.stringify(failureResult);
```

Note: the above API was a proposal and slightly different from the original implementation.
