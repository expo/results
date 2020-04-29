# Changelog

## 1.0.0
- Remove official Node 8.x compatibility (support 10.x and up). The package still will run on Node 8 LTS (with async functions), though.

## 0.3.0

### Additions
- Export `Success` and `Failure` types in TypeScript declarations.

## 0.2.0

### Breaking changes
- Calling `Result#enforceValue()` on a failure result now throws the failure reason instead of throwing a new `TypeError`. This helps propagate underlying errors up the call stack instead of masking them with `TypeError` instances that don't specify what caused the failure.

### Additions
- `enforceAsyncResult`, a function to convert promises that return results into promises that return unwrapped values or throw. This is the inverse of `asyncResult`.

## 0.1.1

Initial version of the Results API.
