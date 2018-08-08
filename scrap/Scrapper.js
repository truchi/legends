const axios   = require('axios')
const cheerio = require('cheerio')

class Scrapper {
  async scrap() {
    const count = await this._getPageCount()

    const URLs = [].concat.apply([],
      await Promise.all(
        Array.from(Array(count + 1).keys())
          .map((page) => {
            if (page === count) return []
            page++

            return this._getPageList(page)
          })
      )
    )

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
    let data = []
    for (let URL of URLs) {
      const d = await this._getCardData(URL)
      await sleep(50)
      data.push(d)
    }

    return data
  }

  async _getPageCount() {
    const html  = await this._getURL(Scrapper.URLFn(1))
    const $     = cheerio.load(html.data)
    const count = $('.pagination .pagin:nth-last-child(2)').html()

    return +count
  }

  async _getPageList(page) {
    const html = await axios.get(Scrapper.URLFn(page))
    const $    = cheerio.load(html.data)

    return $('.tooltipcard').map((i, card) => $(card).attr('href')).get()
  }

  async _getCardData(URL) {
    const html = await axios.get(URL)
    const $    = cheerio.load(html.data)

    const data = $($('.table_large').get(0)).find('tr').map((i, tr) => {
      tr = $(tr)
      let key   = tr.find('td:first-child .midlarge').text().trim()
      let value = null

      switch (key) {
        case 'Name':
        case 'Rarity':
        case 'Type':
        case 'Race':
        case 'Magicka Cost':
        case 'Attack':
        case 'Health':
        case 'Expansion set':
        case 'Unlocked in':
        case 'Soul Summon':
        case 'Soul Trap':
        case 'Text':
          value = tr.find('.text_right').text().trim()
          value = value ? value : null;

          break;
        case 'Keywords':
          value = tr.find('.text_right').text().trim()
          value = value ? value.split(',') : null;

          break;
        case 'Attributes':
          const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

          value = tr.find('.text_right img')
            .map((i, img) => {
              const src  = $(img).attr('src')
              const exec = Scrapper.attributesRe.exec(src)

              return capitalize(exec[1])
            }).get()

          break;
      }

      switch (key) {
        case 'Magicka Cost':
          key   = 'cost'
          value = +value

          break;
        case 'Expansion set':
          key = 'set'

          break;
        case 'Unlocked in':
          key = 'in'

          break;
        case 'Soul Summon':
          key   = 'summon'
          value = +value

          break;
        case 'Soul Trap':
          key   = 'trap'
          value = +value

          break;
      }
      key = key.toLowerCase()

      return value === null ? null : [[ key, value ]]
    }).get()
      .reduce((data, [ key, value ]) => {
        data[key] = value

        return data
      }, {})

    const exec = Scrapper.slugRe.exec(URL)
    data.slug  = exec[1]
    data.img   = `https://www.legends-decks.com/img_cards/${ data.slug }.png`

    return data
  }

  _getURL(URL) {
    return new Promise (async (resolve, reject) => {
      try {
        const response = await axios.get(URL)
        resolve(response)
      } catch (error) {
        reject(error)
      }
    })
  }
}

Scrapper.URLFn        = (page) => `https://www.legends-decks.com/cards/all/mana-up/${ page }/list`
Scrapper.attributesRe = /https:\/\/www\.legends-decks\.com\/interface\/(neutral|strength|intelligence|endurance|willpower|agility)\.png/
Scrapper.slugRe       = /https:\/\/www\.legends-decks\.com\/card\/\d+\/([a-z]+)/

module.exports = Scrapper
