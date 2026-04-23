const express = require('express')
const app = express()
app.use(express.json())

// NO AUTH on status and ping — public
app.get('/ping', (req, res) => res.json({ ok: true }))
app.get('/status', (req, res) => res.json({
  status: 'running',
  uptime: process.uptime(),
  timestamp: new Date().toISOString()
}))

const PORT = process.env.PORT
console.log(`Starting on PORT: ${PORT}`)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API listening on ${PORT}`)
})