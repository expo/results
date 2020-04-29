# @expo/results
[![Tests](https://github.com/expo/results/workflows/Tests/badge.svg)](https://github.com/expo/results/actions?query=branch%3Amaster)
[![codecov](https://codecov.io/gh/expo/results/branch/master/graph/badge.svg)](https://codecov.io/gh/expo/results)

An efficient, standards-compliant library for representing results of successful or failed operations. A result object represents the result of an operation that can either return a value successfully or fail. Typically we'd simply either return a value or throw an error, but sometimes we perform multiple operations as a batch, some of which may succeed and others fail. Since we can't simultaneously return values and throw errors, we instead return collections of result objects. This allows a batch operation to return values for successful operations and errors for failed ones without loss of information, namely the errors. (In contrast, sometimes it is appropriate for a batch operation to return just successful values and omit values for failed operations.)

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

function fetchWebPage(url: string): Promise<Result<string>> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    return result(text);
  } catch (e) {
    return result(e);
  }
}
```
