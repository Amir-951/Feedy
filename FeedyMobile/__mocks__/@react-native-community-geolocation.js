module.exports = {
  requestAuthorization: jest.fn((success) => {
    if (typeof success === 'function') success();
  }),
  getCurrentPosition: jest.fn((_success, error) => {
    if (typeof error === 'function') {
      error({ message: 'GPS unavailable in tests' });
    }
  }),
};
