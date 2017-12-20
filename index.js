/**
 * nodemon index.js
 * ^ normal
 *
 * nodemon index.js test
 * ^ using a connected serial port
 *
 * nodemon index.js test without
 * ^ without serial port or io
 */


const socketServer = 'ws://merrymerkle.intransit.xyz'
const serialPort = '/dev/tty-usbserial1'

const RECENT_DONATION = 'RECENT_DONATION'
const TIER_REACHED = 'TIER_REACHED'

const BigNumber = require('bignumber.js')
const socket = require('socket.io-client')
const SerialPort = require('serialport')

const isTesting = process.argv[2] === 'test'
const isTestingWithout = process.argv[3] === 'without'

if (isTestingWithout) {
  // if testing without
  const SerialPort = require('serialport/test')
  const MockBinding = SerialPort.Binding

  // Create a port and enable the echo and recording.
  MockBinding.createPort(serialPort, { echo: true, record: true })
}

/**
 * utils
 */

const onError = (err) => {
  console.error(err)
  process.exit(1)
}

const errorOrNotify = (msg) => (err) => {
  if (err) { onError(err) }
  console.log(msg)
}

function convertRange( value, r1, r2 ) {
  return ( value - r1[ 0 ] ) * ( r2[ 1 ] - r2[ 0 ] ) / ( r1[ 1 ] - r1[ 0 ] ) + r2[ 0 ]
}

/**
 * setup
 */

const io = socket(socketServer)
const port = new SerialPort(serialPort, {
  baudRate: 9600
})

/**
 * handler fns
 */

const handleRecentDonation = (data) => {
  const ethValue = (new BigNumber(data.value)).div(10 ** 18).toNumber()
  const maxEthWeCareAbout = 12
  const treeValue = Math.floor(convertRange(Math.min(ethValue, maxEthWeCareAbout),
    [0, maxEthWeCareAbout],
    [4, 9]
  ))
  port.write(treeValue.toString(), errorOrNotify(`Delivered donation of ${ethValue} ETH -> code ${treeValue}`))
}

const handleTierReached = (data) => {
  port.write(data.tier.toString(), errorOrNotify(`Delivered tier ${data.tier}`))
}

/**
 * handler config
 */

io.on(RECENT_DONATION, handleRecentDonation)
io.on(TIER_REACHED, handleTierReached)
io.on('error', onError)
port.on('error', onError)

/**
 * testing code
 */

if (isTesting) {
  // if we're testing, increment tiers every 30 seconds
  for (let i = 1; i <= 3; i++) {
    (function (i) {
      setTimeout(() => {
        handleTierReached({ tier: i })
      }, i * 30 * 1000)
    })(i)
  }

  // and randomly get a new donation
  setInterval(() => {
    const randomEthValue = BigNumber.random().mul(BigNumber.random().mul(10)).mul(10 ** 18)
    handleRecentDonation({ value:  randomEthValue })
  }, 3000)
}