((window, document, fetch) => {
  const $ = document.querySelector.bind(document)
  const $$ = document.querySelectorAll.bind(document)
  const createEl = document.createElement.bind(document)

  function getAllBookmarks(node) {
    const bookmarks = []

    function flatAllBookmarks(node) {
      node.forEach(n => {
        if (n.children) {
          flatAllBookmarks(n.children)
        } else {
          bookmarks.push({
            id: n.id,
            date: n.dateAdded,
            title: n.title,
            url: n.url
          })
        }
      })
    } 

    flatAllBookmarks(node)

    return bookmarks
  }

  function getStatus(statusCode) {
    if (statusCode < 400) return 'ok'
    if (statusCode >= 400 && statusCode < 500) return 'error1'
    if (statusCode >= 500) return 'error2'

    return 'unknown'
  }

  function pingBookmarks(bookmarks, render) {
    let pointer = 6

    return new Promise((resolve, reject) => {
      function request(index, bookmarks) {
        const bookmark = bookmarks[index]

        if (!bookmark) {
          return resolve(bookmarks)
        }

        const { url, title } = bookmark

        fetch(url, {
          cache: 'no-cache'
        }).then(res => {
          bookmark.status = res.status
        }).catch(err => {
          bookmark.status = 500
          bookmark.statusText = err
        }).finally(() => {
          render(bookmark)

          request(pointer, bookmarks)      
          pointer += 1
        })
      }

      bookmarks.slice(0, pointer).forEach((bookmark, index) => {
        request(index, bookmarks)
      })
    })
  }

  function checkRequest(bookmarks) {
    return bookmarks.every(b => b.status)
  }

  function renderBookmark(bookmark) {
    const item = createEl('div')
    const link = createEl('a')
    const status = createEl('span')
    const date = createEl('span')
    const archiveLink = createEl('a')

    status.className = 'status'
    date.className = 'date'
    item.className = `item ${getStatus(bookmark.status)}`
    link.className='link'
    archiveLink.className = 'archive'

    link.textContent = bookmark.title
    link.title = bookmark.title 
    link.setAttribute('href', bookmark.url)
    link.setAttribute('target', '_blank')

    status.className = `status status-${getStatus(bookmark.status)}`
    status.title = `${bookmark.status} ${bookmark.statusText ? bookmark.statusText : ''}`

    const d = new Date(bookmark.date)
    date.className = 'date'
    date.textContent = `${d.getFullYear()}/${d.getMonth()}/${d.getDate()}`
    date.title = d.toString()

    archiveLink.textContent = 'Archive'
    archiveLink.setAttribute('href', `https://web.archive.org/web/${bookmark.url}`)
    archiveLink.setAttribute('target', '_blank')

    item.insertAdjacentElement('afterbegin', status)
    item.appendChild(link)
    item.insertAdjacentElement('afterbegin', date)
    bookmark.status > 300 && item.insertAdjacentElement('afterbegin', archiveLink)

    $('#main').appendChild(item)
  }

  function renderFilter() {
    const filterError1 = $('#filter-error1')
    const filterError2 = $('#filter-error2')
    const filterOk = $('#filter-ok')
    const main = $('#main')

    filterError1.addEventListener('click', () => {
      filterError1.classList.add('active')
      main.classList.add('error1')

      filterError2.classList.remove('active')
      filterOk.classList.remove('active')
      main.classList.remove('ok')
      main.classList.remove('error2')
    }, false)

    filterError2.addEventListener('click', () => {
      filterError2.classList.add('active')
      main.classList.add('error2')

      filterError1.classList.remove('active')
      filterOk.classList.remove('active')
      main.classList.remove('ok')
      main.classList.remove('error1')
    }, false)

    filterOk.addEventListener('click', () => {
      filterOk.classList.add('active')
      main.classList.add('ok')

      filterError2.classList.remove('active')
      filterError1.classList.remove('active')
      main.classList.remove('error1')
      main.classList.remove('error2')
    }, false)
  }

  function setCount(bookmarks) {
    const count = $('.count')

    count.textContent = bookmarks.length
  }

  chrome.bookmarks.getTree(tree => {
    const bookmarks = getAllBookmarks(tree)

    renderFilter(bookmarks.length)

    setCount(bookmarks)

    pingBookmarks(bookmarks, renderBookmark).then((bookmarks) => {
      const id = setInterval(() => {
        if (checkRequest(bookmarks)) {
          clearInterval(id)
          $('.loading').remove()
          chrome.storage.local.set({
            bookmarks
          }, () => {
            window.bookmarks = bookmarks
          })
        }
      }, 2000)
    })
  })
})(window, document, fetch)