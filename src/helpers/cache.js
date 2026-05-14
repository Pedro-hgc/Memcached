function cacheGet(cache, key) {                                                                                                                                                                 
    return new Promise((resolve) => {                                                                                                                                                           
        cache.get(key, (err, data) => {                                                                                                                                                         
            if (err) {                                                                                                                                                                          
                console.error(`Cache GET error for ${key}:`, err)                                                                                                                               
                resolve(null)                                                                                                                                                                   
            } else {                                                                                                                                                                            
                resolve(data)                                                                                                                                                                   
            }                                                                                                                                                                                   
        })                                                                                                                                                                                      
    })                                                                                                                                                                                          
}                                                                                                                                                                                               
                                                                                                                                                                                                
function cacheSet(cache, key, value, ttl = 300) {                                                                                                                                               
    return new Promise((resolve) => {                                                                                                                                                           
        cache.set(key, JSON.stringify(value), ttl, (err) => {                                                                                                                                   
            if (err) {                                                                                                                                                                          
                console.error(`Cache SET error for ${key}:`, err)                                                                                                                               
            }                                                                                                                                                                                   
            resolve()                                                                                                                                                                           
        })                                                                                                                                                                                      
    })                                                                                                                                                                                          
}                                                                                                                                                                                               

function cacheDel(cache, key) {
    return new Promise ((resolve) => {
        cache.del(key, (err) => {
            if (err) {
                console.error(`Cache DEL error for ${key}: ${err}`)
            }
            resolve()
        })
    })
}
                                                                                                                                                                                                
module.exports = { cacheGet, cacheSet, cacheDel }  
