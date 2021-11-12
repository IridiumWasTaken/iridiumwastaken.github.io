const httpntlm = require('httpntlm')


// Send a request to NAV using NTLM authentication.
// Relies on values stored in environmental variables.
async function sendNtlmRequest({ 
    method, url, json, username, password, domain, etag
}, requestCallback) {
    const options = { 
        headers: {
            'Content-Type': 'application/json',
            'if-match': etag
        },
        url, 
        username, 
        password,
        domain,
        json 
    }
    try {
        const result = await new Promise((resolve, reject) => {
            httpntlm[method](options, (err, res) => {
                if(err) {
                    reject(err)
                }
                resolve(res)
            })
        })
        requestCallback(null, result)
    } catch(err) {
        // console.log('failed', err)
        requestCallback(err)
    }
}

function initialize({ username, password, domain }) {
    return request;
    
    async function request({ method, url, json, etag }, responseCallback){
        const options = {
            method: method.toLowerCase(), // httpntlm uses lowercase methods
            url, username, password, domain, json, etag
        }
        sendNtlmRequest(options, (err, data) => {
            if(err) {
                responseCallback(err)
            } else {
                responseCallback(null, data)
            }
        })
    }    
}



module.exports = {
    initialize
}