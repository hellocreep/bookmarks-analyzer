((window, document) => {
  chrome.storage.local.get(['bookmarks'], (bookmarks) => {
    console.log('bookmarks', bookmarks)
  })
})(window, document)