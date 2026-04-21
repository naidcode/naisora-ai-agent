const express = require('express')
const app = express()
app.use(express.json())

const SECRET = process.env.AGENT_API_SECRET || 'naisora_secret_2026'

const auth = (req, res, next) => {
  const key = req.headers['x-api-secret']
  if (key !== SECRET) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

// Public health check — no auth
app.get('/ping', (req, res) => {
  res.json({ ok: true })
})

// Public status — no auth needed to test
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  })
})

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

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Agent API running on port ${PORT}`)
})