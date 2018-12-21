require('dotenv').config()
let v = process.env
let os = require("os")
let fs = require('fs')
let httpProxy = require('http-proxy')

let appUrl = v.APP_URL

let proxy = httpProxy.createProxyServer({
    target: appUrl
})

proxy.on('proxyReq', function (proxyReq, req, res) {
    log(Buffer.from(`${req.method} ${req.url}`))
    log(Buffer.from(JSON.stringify(proxyReq._headers, true, 2)), 'data')

    req.on('data', (chunk) => {
        log(chunk, 'data')
    })
    interceptBody(res, (chunk) => {
        log(chunk, 'data')
    })
})

proxy.on('proxyRes', function (proxyRes, req, res) {
    log(Buffer.from(`Response status: ${res.statusCode}`))
    log(Buffer.from(JSON.stringify(proxyRes.headers, true, 2)), 'data')
})

proxy.listen(v.PROXY_PORT)


let interceptBody = (res, handleBody) => {
    let oldWrite = res.write
    let oldEnd = res.end

    var chunks = []

    res.write = function (chunk) {
        if (chunk)
            chunks.push(new Buffer(chunk))
        oldWrite.apply(res, arguments)
    }

    res.end = function (chunk) {
        if (chunk)
            chunks.push(new Buffer(chunk))
        oldEnd.apply(res, arguments)

        var body = Buffer.concat(chunks)
        handleBody(body)
    }
}

let wtLog = undefined
if(v.LOG_FILE) {
    wtLog = fs.createWriteStream(v.LOG_FILE, { flags: 'a', encoding: 'utf8' })
}

let log = (chunk, category = 'summary') => {
    if((v.LOG_CONSOLE) && (v.DEBUG.indexOf(category) > -1)) {
        console.log(chunk.toString('utf8'))
    }
    if((wtLog) && (v.DEBUG.indexOf(category) > -1)) {
        wtLog.write(chunk, (err) => {
            if(err)
                console.error(err)
        })
        wtLog.write(os.EOL, (err) => {
            if(err) {
                console.error(err)
            }
        })
    }
}