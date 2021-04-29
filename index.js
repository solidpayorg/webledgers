function getLedger (uri) {
  try {
    return require(uri)
  } catch (e) {
    return null
  }
}

function getRawLedger (uri) {
  try {
    return require(uri)
  } catch (e) {
    return null
  }
}

exports.getLedger = getLedger
exports.getRawLedger = getRawLedger
