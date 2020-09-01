require('dotenv').config()
const Telegram = require("node-telegram-bot-api")
const config = require("./config")
const helper = require("./helper.js")
const keyboard = require("./keyboard")
const kb = require("./keyboard-buttons")

const bot = new Telegram(config.TOKEN, {polling:true})
helper.logStart()

bot.on('message', msg =>{
  console.log(msg)
  const chatId = helper.getChatId(msg)

  switch (msg.text) {
    case kb.home.favourite:
      break
    case kb.home.films:
      bot.sendMessage(chatId, 'Выберите жанр', {
        reply_markup:{keyboard: keyboard.films}
      })
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
