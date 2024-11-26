const express = require('express')
require('dotenv').config()
const cors = require('cors')
const Hotel = require('./models/hotel.js')

const app = express()
const mongoose = require('mongoose')
const port = 4000

const corsOptions = {
  origin: '*', // Allow all origins (use specific domains for stricter control)
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials: true, // Allow cookies or authorization headers
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(
  express.urlencoded({
    extended: true,
  })
)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

mongoose.connect(process.env.DB).then(() => console.log('Mongo Db Connected!'))

app.get('/', async (req, res) => {
  res.send('GET request to the homepage')
})

//new room initail data setup

app.post('/hotel/new', async (req, res) => {
  try {
    const rooms = req.body
    for (const room of rooms) {
      const {
        id,
        roomId,
        type,
        floor,
        imageUrl,
        price,
        isAvailable,
        hasBalcony,
        hasBreakfast,
      } = room
      if (
        !roomId ||
        !type ||
        !floor ||
        !imageUrl ||
        !price ||
        isAvailable == undefined ||
        hasBalcony == undefined ||
        hasBreakfast == undefined
      ) {
        return res.status(400).json({
          msg: 'All fields are required',
        })
      }
      const newRoom = new Hotel({
        id,
        roomId,
        type,
        floor,
        imageUrl,
        price,
        isAvailable,
        hasBalcony,
        hasBreakfast,
      })
      const item = await newRoom.save()
    }
    res.status(201).json({
      message: 'Rooms created successfully',
    })
  } catch (error) {
    return res.status(400).json({
      msg: 'Invalid data',
      error: error.message,
    })
  }
})

const url = '/api/v1/rooms'

app.get(url, async (req, res) => {
  try {
    const rooms = await Hotel.find({ isAvailable: true })
    res.status(200).json({
      rooms: rooms,
    })
  } catch (error) {
    res.status(500).json({
      error: error.message,
    })
  }
})

app.get(url + '/:id', async (req, res) => {
  try {
    const room = await Hotel.findOne({ id: req.params.id })
    if (!room) res.status(404).json({ message: 'A room with this ID does not exist' })
    res.json({ room: room })
  } catch (error) {
    res.status(500).json({
      error: error.message,
    })
  }
})

//check if room is available
app.get(
  url + '/availability/checkin/:dateIN/checkout/:dateuot',
  async (req, res) => {
    try {
      const rooms = await Hotel.find()
      let availableRooms = []

      if (!body.params.checkin || !body.params.checkout) return res.status(404).json({ error: 'Bad checkin date format or date not provided' })

      for (const room of rooms) {
        if (room.reservations) {
          let reservationFound = false
          for (const reservation of room.reservations) {
            //check reserved
            if (
              !dateOverlap(
                reservation.checkin,
                reservation.checkout,
                req.params.dateIN
              ) &&
              !dateOverlap(
                reservation.checkin,
                reservation.checkout,
                req.params.dateOUT
              )
            ) {
              console.log('TRUE OVERLAP')
              reservationFound = true
              break
            }
          }
          if (reservationFound) continue
          availableRooms.push(room)
        }
      }

      return res.status(200).json({
        availableRooms: availableRooms,
      })
    } catch (error) {
      res.status(500).json({
        error: error.message,
      })
    }
  }
)

// make reservation
app.post(url + '/:id/reservation', async (req, res) => {
  try {
    const id = req.params.id
    const room = await Hotel.findOne({ id: id })
    if (!room) return res.status(404).json({ error: '"A room with this ID does not exist' })

    const { name, checkin, checkout } = req.body
    if (!name || !checkin || !checkout) {
        return res.status(404).json({ error: 'Validation failed', fields: { name: "The name field is required.", checkin: "The checkin must be a string.", checkout: "The checkout must be a string."}})
    }

    // there are reservations available
    if (room.reservations) {
      for (const reservation of room.reservations) {
        //check reserved
        if (isDateInRange(reservation.checkin, reservation.checkout)) {
          room.isAvailable = false
        } else {
          room.isAvailable = false
        }

        if (
          dateOverlap(reservation.checkin, reservation.checkout, checkin) ||
          dateOverlap(reservation.checkin, reservation.checkout, checkout)
        ) {
          return res.status(400).json({
            msg: 'Room is already reserved for this period',
          })
        }
      }
    }
    // there are no reservations available
    room.isAvailable = false
    const code = generateCode()
    room.reservations.push({ name, checkin, checkout, code })
    await room.save()
    return res.status(201).json({ name, checkin, checkout, code })
  } catch (error) {
    res.status(500).json({
      error: error.message,
    })
  }
})


//get your reservations

app.post(url + '/reservations', async (req, res) => {
  try {
    const rooms = await Hotel.find()
    const {name, code} = req.body

    if( !code || !name) return res.status(404).json({ error: 'Unauthorized' })

    for (const room of rooms) {
        for (reservation of room.reservations) {
            if (reservation.name === name && reservation.code === code) {
                return res.status(200).json({
                  reservation: reservation,
                })
            }
        }
    }
    return res.status(404).json({ error: 'Unauthorized' })

  } catch (error) {
    res.status(500).json({
      error: error.message,
    })
  }
})


//cancel your reservation
app.post(url + '/reservations/:id/cancel', async (req, res) => {
    try {
      const rooms = await Hotel.find()
      const {name, code} = req.body
  
  
      for (const room of rooms) {
        console.log("checked ROOM ", room)
          for (reservation of room.reservations) {
            console.log("checked ", reservation)
              if (reservation.name === name && reservation.code === code) {
                console.log("found")
                const result = await Hotel.updateOne(
                    { _id: room._id },
                    {
                      $pull: {
                        reservations: { _id: new mongoose.Types.ObjectId(reservation._id) },
                      },
                    }
                  )
                  if (result) {
                    return res.status(200).json({ message: 'success' })
                  }
                  
              }
          }
      }
    //   return res.status(404).json({ error: 'Unauthorized' })
      return res.status(404).json({ error: '"A reservation with this ID does not exist' })
  
    } catch (error) {
      res.status(500).json({
        error: error.message,
      })
    }
  })

const isDateInRange = (startDate, endDate) => {
  const today = new Date()

  const start = new Date(startDate)
  const end = new Date(endDate)

  return today >= start && today <= end
}
const dateOverlap = (startDate, endDate, date) => {
  const targetDate = new Date(date)

  const start = new Date(startDate)
  const end = new Date(endDate)

  return targetDate >= start && targetDate <= end
}

const generateCode = () => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}
