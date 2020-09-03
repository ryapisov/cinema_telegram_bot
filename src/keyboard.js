const kb = require("./keyboard-buttons")

module.exports = {
  home:[
    [kb.home.films, kb.home.cinemas],
    [kb.home.favourite]
  ],
  films:[
    [kb.film.random],
    [kb.film.action, kb.film.comedy],
    [kb.back]
  ],
  cinemas:[
    [
      {
        text: "Отправить местоположения",
        request_location: true
      }
    ],
    [kb.back]
  ]
}
