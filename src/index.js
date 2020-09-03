require('dotenv').config()
const log = console.log
const Telegram = require("node-telegram-bot-api")
const mongoose = require("mongoose")
const config = require("./config")
const helper = require("./helper.js")
const keyboard = require("./keyboard")
const kb = require("./keyboard-buttons")
const database = require("../database.json")

require("./models/film.model")
require("./models/cinema.model")


const Film = mongoose.model("Film")
const Cinema = mongoose.model("Cinema")

helper.logStart()

mongoose.connect(config.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(()=> log('Mongo connect'))
  .catch((err)=> log('Mongo is not connected'))

// database.films.forEach((f)=>{
//   new Film(f).save().catch((err)=> log(err))
// })

// database.cinemas.forEach(c =>{
//   new Cinema(c).save().catch((e)=> log('ОШИБКА!!!!!!', e))
// })

const bot = new Telegram(config.TOKEN, {polling:true})

bot.on('message', msg =>{
  const chatId = helper.getChatId(msg)

  switch (msg.text) {
    case kb.home.favourite:
      break
    case kb.home.films:
      bot.sendMessage(chatId, 'Выберите жанр', {
        reply_markup:{keyboard: keyboard.films}
      })
      break
    case kb.film.comedy:
      sendFilmsByQuery(chatId, {type:'comedy'})
      break
    case kb.film.action:
      sendFilmsByQuery(chatId, {type:'action'})
      break
    case kb.film.random:
      sendFilmsByQuery(chatId, {})
      break

    case kb.home.cinemas:
      bot.sendMessage(chatId, `Отправить местоположения`,{
        reply_markup:{
          keyboard: keyboard.cinemas
        }
      })
      break
    case kb.back:
      bot.sendMessage(chatId, 'Что хотите посмотреть?', {
        reply_markup:{keyboard: keyboard.home}
      })
      break
  }

  if(msg.location){
    log(msg.location)
  }

})

bot.onText(/\/start/, msg => {
  const text = `Hi!, ${msg.from.first_nsme} \nКоманда:`

  bot.sendMessage(helper.getChatId(msg),  text, {
    reply_markup:{
      keyboard: keyboard.home
    }
  })
})

bot.onText(/\/f(.+)/, (msg, [source, match])=>{
  // parse, вырезать f и пробел: f f123
  const filmUuid = helper.getItemUuid(source)
  const chatId = helper.getChatId(msg)

  Film.findOne({uuid:filmUuid}).then(film =>{
    const caption = `
      Название: ${film.name}\n
      Год выпуска: ${film.year}\n
      Рейтинг:${film.rate}\n
      Длительность:${film.length}\n
      Страна:${film.country}
    `
    bot.sendPhoto(chatId, film.picture, {
      caption,
      reply_markup:{
        inline_keyboard:[
          [
            {
              text:"Добавить в избранное",
              callback_data: film.uuid
            },
            {
              text:"Показать кинотеатры",
              callback_data: film.uuid
            }
          ],
          [
            {
              text:`Кинопоиск: ${film.name}`,
              url: film.link
            }
          ]
        ]
      }
    })
  })
})

function sendFilmsByQuery(chatId, query){
  Film.find(query).then(films=>{

    const html = films.map((f, i)=>{
      return `<b>${i+1}</b> ${f.name} - /f${f.uuid}`
    }).join('\n')

    sendHTML(chatId, html, 'films')
  })
}

function sendHTML(chatId, html, kbName = null){
  const options = {
    parse_mode: "HTML"
  }

  if (kbName){
    options['reply_markup'] = {
      keyboard: keyboard[kbName]
    }
  }

  bot.sendMessage(chatId, html, options)
}
