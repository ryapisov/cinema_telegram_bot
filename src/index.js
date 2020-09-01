require('dotenv').config()
const Telegram = require("node-telegram-bot-api")
const config = require("./config")
const helper = require("./helper.js")

const bot = new Telegram(config.TOKEN, {polling:true})
helper.logStart()

bot.on('message', msg =>{
  console.log(msg)
})
