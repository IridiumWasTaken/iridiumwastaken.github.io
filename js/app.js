const { initialize } = require('/js/navclient')

const authOptions = {
    username: 'a.loewenstein',
    password: 'AQ1sw2',
    domain: 'tardis'
}

const request = initialize(authOptions)

const requestOptions = {
    method: 'GET',
    url: "http://172.20.2.10:8048/BC190-DEV/api/home/standard/v2.0/",
    /*
    body : JSON.stringify({
        Description: 'Milkshake'
    })
    */
}

request(requestOptions, (err, data) => {
    if(err) {
        return console.log(err)
    } 
    console.log(JSON.stringify(data))
})