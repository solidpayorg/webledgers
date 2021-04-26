function getLedger (uri) {
  try {
    return require(uri)
  } catch (e) {
    return null
  }
}
