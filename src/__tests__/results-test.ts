import { ResultStatus, asyncResult, enforceAsyncResult, result } from '../results';

describe(result, () => {
  test(`creates a success result`, () => {
    const success = result('Success!');
    expect(success.ok).toBe(true);
    expect(success.status).toBe(ResultStatus.Fulfilled);
    expect(success.value).toBe('Success!');
    expect(success.reason).toBeUndefined();
    expect(success.enforceValue()).toBe('Success!');
    expect(() => success.enforceError()).toThrowError();
  });

  test(`creates a void success result`, () => {
    const success = result();
    expect(success.ok).toBe(true);
    expect(success.status).toBe(ResultStatus.Fulfilled);
    expect(success.value).toBeUndefined();
    expect(success.reason).toBeUndefined();
    expect(success.enforceValue()).toBeUndefined();
    expect(() => success.enforceError()).toThrowError();
  });

  test(`creates a failure result`, () => {
    const error = new Error('Intentional error');
    const failure = result(error);
    expect(failure.ok).toBe(false);
    expect(failure.status).toBe(ResultStatus.Rejected);
    expect(failure.value).toBeUndefined();
    expect(failure.reason).toBe(error);
    expect(failure.enforceError()).toMatchInlineSnapshot(`[Error: Intentional error]`);
    expect(() => failure.enforceValue()).toThrowError(error);
  });
});

describe(asyncResult, () => {
  test(`resolves to a success result if the promise is resolved`, async () => {
    const testResult = await asyncResult(Promise.resolve('Success!'));
    expect(testResult.ok).toBe(true);
  });

  test(`resolves to a void success result if the promise resolves to void`, async () => {
    const testResult = await asyncResult(Promise.resolve());
    expect(testResult.ok).toBe(true);
    expect(testResult.value).toBeUndefined();
  });

  test(`resolves to a failure result if the promise is rejected`, async () => {
    const testResult = await asyncResult(Promise.reject(new Error('Intentional error')));
    expect(testResult.ok).toBe(false);
  });

  test(`converts promise errors to Error objects`, async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    const testResult = await asyncResult(Promise.reject('Intentional error'));
    expect(testResult.reason).toBeInstanceOf(Error);
    expect(testResult.reason?.message).toMatch('Intentional error');
  });
});

describe(enforceAsyncResult, () => {
  test(`resolves to a success result's value`, async () => {
    const resultPromise = Promise.resolve(result('Success!'));
    await expect(enforceAsyncResult(resultPromise)).resolves.toBe('Success!');
  });

  test(`throws a failure result's reason`, async () => {
    const resultPromise = Promise.resolve(result(new Error('Intentional error')));
    await expect(enforceAsyncResult(resultPromise)).rejects.toThrowError('Intentional error');
  });

  test(`is the inverse of "asyncResult"`, async () => {
    const value = 'Success!';
    await expect(enforceAsyncResult(asyncResult(Promise.resolve(value)))).resolves.toBe(value);

    const reason = new Error('Intentional error');
    await expect(enforceAsyncResult(asyncResult(Promise.reject(reason)))).rejects.toThrowError(
      'Intentional error'
    );
  });
});

describe('Result', () => {
  test(`specifies the result type in its string representation`, () => {
    const success = result('Success!');
    const voidSuccess = result();
    const failure = result(new Error('Intentional error'));
    expect(String(success)).toBe('[object Success]');
    expect(String(voidSuccess)).toBe('[object Success]');
    expect(String(failure)).toBe('[object Failure]');
  });

  test(`serializes to JSON the same way standard promise results do`, () => {
    const success = result('Success!');
    const voidSuccess = result();
    const failure = result(new Error('Intentional error'));
    expect(JSON.stringify(success)).toBe('{"status":"fulfilled","value":"Success!"}');
    expect(JSON.stringify(voidSuccess)).toBe('{"status":"fulfilled"}');
    expect(JSON.stringify(failure)).toBe('{"status":"rejected","reason":{}}');
  });
});
