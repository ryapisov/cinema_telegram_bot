const log = console.log

module.exports = {
  logStart(msg = ''){
    log('Bot has been started ...\n', msg)
  },

  getChatId(msg){
    return msg.chat.id
  }
}
