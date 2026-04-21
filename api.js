const express = require('express')
const app = express()
app.use(express.json())

const SECRET = process.env.AGENT_API_SECRET || 'naisora_secret_2026'

// Auth middleware
const auth = (req, res, next) => {
  const key = req.headers['x-api-secret']
  if (key !== SECRET) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

// Agent status
app.get('/status', auth, (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  })
})

// Run any module
app.post('/run-module', auth, async (req, res) => {
  const { module, params } = req.body
  try {
    const mod = require(`./modules/${module}`)
    const result = await mod.run(params)
    res.json({ success: true, result })
  } catch (err) {
    res.json({ success: false, error: err.message })
  }
})

// Live logs via SSE
app.get('/logs', auth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  const interval = setInterval(() => {
    send({ time: new Date().toISOString(), message: 'Agent heartbeat OK', type: 'info' })
  }, 5000)

  req.on('close', () => clearInterval(interval))
})

const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => console.log(`Agent API running on port ${PORT}`))