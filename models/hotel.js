const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    checkin: Date,
    checkout: Date,
    name: String,
    code: String,
})

const hotelSchema = new mongoose.Schema({
    id: Number,
    roomId: Number,
    type: Number,
    floor: Number,
    imageUrl: String,
    price: Number,
    isAvailable: {
        type: Boolean,
        default: true
    },
    hasBalcony: {
        type: Boolean,
        default: true
    },
    hasBreakfast: {
        type: Boolean,
        default: true 
    },
    reservations: [reservationSchema]
})



const Hotel = new mongoose.model("hotel", hotelSchema)
module.exports = Hotel;