const Scrapper = require('./Scrapper.js')

const scrapper = new Scrapper()
;(async () => {
  const data = await scrapper.scrap()

  console.log(data)
})()
