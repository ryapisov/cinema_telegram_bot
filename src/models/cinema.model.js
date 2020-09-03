const mongoose = require("mongoose")
const Schema = mongoose.Schema

const CinemaShema = new Schema({
  uuid:{ type:String, required:true },
  url:{
    type:String,
  //  required:true 
  },
  name:{ type:String, required:true },
  location:{
    type: Schema.Types.Mixed
  },
  films:{
    type: [String],
    default:[]
  }
})

mongoose.model("Cinema", CinemaShema)
