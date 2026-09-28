const launchImageLibrary = jest.fn(() => Promise.resolve({ assets: [] }));

module.exports = {
  launchImageLibrary,
};
