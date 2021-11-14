import express from 'express'
import cors from 'cors'
import path from 'path';
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import fileUpload from 'express-fileupload';
import cookieParser from 'cookie-parser'
import userRouter from './server/routes/userRoutes.js'
import { errorHandler, notFound } from './server/middleware/error.js';
 
//dotenv config
dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())
// app.use(cookieParser())
app.use(fileUpload({
    useTempFiles: true
}))

// Routes
app.use('/user', userRouter)



// Connect to mongodb
const URI = process.env.MONGODB_URL
mongoose.connect(URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, err => {
    if(err) throw err;
    console.log("Connected to mongodb")
})

if(process.env.NODE_ENV === 'production'){
    app.use(express.static('client/build'))
    app.get('*', (req, res)=>{
        res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'))
    })
}

// Error Handler
app.use(notFound);
app.use(errorHandler);


const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log('Server is running on port', PORT)
})