require('dotenv').config()
const log = console.log
const geolib = require("geolib")
const _ = require("lodash")
const Telegram = require("node-telegram-bot-api")
const mongoose = require("mongoose")
const config = require("./config")
const helper = require("./helper.js")
const keyboard = require("./keyboard")
const kb = require("./keyboard-buttons")
const database = require("../database.json")

require("./models/film.model")
require("./models/cinema.model")
require("./models/user.model")


const Film = mongoose.model("Film")
const Cinema = mongoose.model("Cinema")
const User = mongoose.model("User")

const ACTION_TYPE = {
  TOGGLE_FAV_FILM: 'tff',
  SHOW_CINEMAS: 'sc',
  SHOW_CINEMAS_MAP: 'scm',
  SHOW_FILMS:'sf'
}

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
      showFavouriteFilms(chatId, msg.from.id)
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
    // локация пользователя где он сейчас находится
    getCinemasInCoord(chatId, msg.location)
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

  Promise.all([
    Film.findOne({uuid:filmUuid}),
    // узнаём находится ли у юзера фильм в избранно
    User.findOne({telegramId: msg.from.id})
  ]).then(([film, user])=>{

    let isFav = false

    if(user){
      isFav = user.films.indexOf(film.uuid) !== -1
    }

    const favText = isFav ? 'Удалить из избранного' : `Добавить в избранное?`

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
              text: favText,
              callback_data: JSON.stringify({
                type: ACTION_TYPE.TOGGLE_FAV_FILM,
                filmUuid: film.uuid,
                isFav: isFav
              })
            },
            {
              text:"Показать кинотеатры",
              callback_data: JSON.stringify({
                type: ACTION_TYPE.SHOW_CINEMAS,
                cinemaUuids: film.cinemas
              })
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

bot.onText(/\/c(.+)/, (msg, [source, match])=>{
  const cinemaUuid = helper.getItemUuid(source)
  const chatId = helper.getChatId(msg)

  Cinema.findOne({uuid: cinemaUuid}).then(cinema =>{
    bot.sendMessage(chatId, `Кинотеатр ${cinema.name}`, {
      reply_markup:{
        inline_keyboard:[
          [
            {
              text: cinema.name,
              url: "cinema.url/должен быть путь"// cinema.url пуст
            },
            {
              text: 'Показать на карте',
              callback_data: JSON.stringify({
                type: ACTION_TYPE.SHOW_CINEMAS_MAP,
                lat: cinema.location.latitude,
                lon: cinema.location.longitude
              })
            }
          ],
          [
            {
              text: 'Показать фильмы',
              callback_data: JSON.stringify({
                type: ACTION_TYPE.SHOW_FILMS,
                filmUuids: cinema.films
              })
            }
          ]
        ]
      }
    })
  })
})

bot.on('callback_query', query =>{
  const userId = query.from.id
  let data

  try{
    data = JSON.parse(query.data)
  }catch(e){
    throw new Error('Data is not an object')
  }

  const { type } = data

  if(type === ACTION_TYPE.SHOW_CINEMAS_MAP){

  }else if(type === ACTION_TYPE.SHOW_CINEMAS){
    sendCinemasByQuery(userId, {uuid: {'$in':data.cinemaUuids}})
  }else if(type === ACTION_TYPE.TOGGLE_FAV_FILM){
    toggleFavouriteFilm(userId, query.id, data)
  }else if(type === ACTION_TYPE.SHOW_FILMS){

  }

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

function getCinemasInCoord(chatId, location){
  // выполнение функции занимает время 5-15 сек.
  Cinema.find({}).then((cinemas)=>{
    // дистанция до кинотеатра
    cinemas.forEach(c =>{
      c.distance = geolib.getDistance(location, c.location)/1000
    })

    cinemas = _.sortBy(cinemas, 'distance')

    const html = cinemas.map((c, i)=>{
      return `<b>${i + 1}</b> ${c.name}.
        <em>Расстояние</em> -
        <strong>${c.distance}</strong> км. /c${c.uuid}
      `
    }).join('\n')

    sendHTML(chatId, html, 'home')
  })
  log('')
}

function toggleFavouriteFilm(userId, queryId, {filmUuid, isFav}){
  let userPromise

  User.findOne({telegramId: userId}).then((user)=>{
    if(user){
      if(isFav){
        user.films = user.films.filter(fUuid=> fUuid !== filmUuid)
      }else{
        user.films.push(filmUuid)
      }
      userPromise = user
    }else{
      userPromise = new User({
        telegramId: userId,
        films: [filmUuid]
      })
    }

    const answerText = isFav ? 'Удалено' : 'Добавлено +'

    userPromise.save().then(_=>{
      bot.answerCallbackQuery({
        callback_query_id: queryId,
        text: answerText
      }).catch(err => log(err))
    }).catch(err => log(err))
  })
}

function showFavouriteFilms(chatId, userId){
  User.findOne({
    telegramId
  }).then((user)=>{
    if(user){
      Film.find({uuid: {'$in':user.films}}).then((films)=>{
        let html

        if(films.length){
          html = films.map((f, i)=>{
            return `<b>${i+1}</b> ${f.name} - <b>${f.rate}</b> (/f${f.uuid})`
          }).join('\n')
        }else{
          html = 'вы ничего не добавили'
        }

        sendHTML(chatId, html, 'home')
      }).catch((err)=> log(err))
    }else{
      sendHTML(chatId, 'Вы ничего не добавили', 'home')
    }
  }).catch((err)=> log(err))
}

function sendCinemasByQuery(userId, query){
  Cinema.find(query).then(cinemas=>{
    const html = cinemas.map((c,i)=>{
      return `<b>${i+1}</b> ${c.name} - /c ${c.uuid}`
    }).join("\n")

    sendHTML(userId, html, 'home')
  })
}
