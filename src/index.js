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
const Film = mongoose.model("Film")
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
      break
    case kb.back:
      bot.sendMessage(chatId, 'Что хотите посмотреть?', {
        reply_markup:{keyboard: keyboard.home}
      })
      break
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
